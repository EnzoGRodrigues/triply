import type { ImageInsight } from "@/types/api";

import { cached, DATA_CACHE_SECONDS, TTL } from "./cache";
import { fetchJson } from "./http";

/**
 * Imagem de capa sugerida via MediaWiki (Wikipedia), com autor/licença do Commons.
 * Tenta, em ordem, os títulos candidatos — cidade, município, país — primeiro na
 * pt.wikipedia e depois na en.wikipedia. SVG (mapas, brasões) é descartado.
 */

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const THUMB_WIDTH = 1280;

interface WikiPage {
  title?: string;
  missing?: boolean;
  pageimage?: string;
  thumbnail?: { source: string };
  original?: { source: string };
}

interface WikiPagesResponse {
  query?: {
    normalized?: Array<{ from: string; to: string }>;
    redirects?: Array<{ from: string; to: string }>;
    pages?: WikiPage[];
  };
}

interface CommonsResponse {
  query?: {
    pages?: Array<{
      missing?: boolean;
      imageinfo?: Array<{
        descriptionurl?: string;
        extmetadata?: Record<string, { value?: string } | undefined>;
      }>;
    }>;
  };
}

export interface ImageQuery {
  /** Cidade/local (ou o próprio país, quando o destino é um país). */
  name: string;
  /** Estado/região, para desambiguar (ex.: "Natal (Rio Grande do Norte)"). */
  region?: string | null;
  /** Município (`admin2` do geocoding), usado quando o local não tem artigo próprio. */
  municipality?: string | null;
  /** Nome do país em português. */
  country?: string | null;
  /** Nome do país em inglês, para a en.wikipedia. */
  countryEnglish?: string | null;
  /** Capital do país: fallback quando o destino é um país (cujo artigo só tem bandeira/mapa em SVG). */
  capital?: string | null;
  isCountry?: boolean;
}

const isSvg = (url: string) => /\.svg/i.test(url);

/** A API acrescenta `?utm_source=...` nas thumbnails; a imagem é a mesma sem isso. */
function withoutTracking(source: string): string {
  try {
    const url = new URL(source);
    url.search = "";
    return url.toString();
  } catch {
    return source;
  }
}

function sanitizeTitle(title: string): string {
  return title.replace(/[|#<>[\]{}_]+/g, " ").replace(/\s+/g, " ").trim();
}

function unique(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const title = value ? sanitizeTitle(value) : "";
    if (title && !seen.has(title.toLowerCase())) {
      seen.add(title.toLowerCase());
      out.push(title);
    }
  }
  return out;
}

function candidates(query: ImageQuery, language: "pt" | "en"): string[] {
  const country = language === "pt" ? query.country : (query.countryEnglish ?? query.country);
  if (query.isCountry) return unique([country ?? query.name, query.capital]);

  return unique([
    // pt.wikipedia desambigua municípios assim; evita "Natal" (a festa) no lugar de Natal-RN.
    language === "pt" && query.region ? `${query.name} (${query.region})` : null,
    query.name,
    query.municipality,
    country,
  ]);
}

/** Acompanha os mapas `normalized` e `redirects` para achar a página de cada candidato. */
function pageFor(title: string, response: WikiPagesResponse): WikiPage | undefined {
  const { normalized = [], redirects = [], pages = [] } = response.query ?? {};
  const follow = (from: string, map: Array<{ from: string; to: string }>) =>
    map.find((entry) => entry.from === from)?.to ?? from;
  const finalTitle = follow(follow(title, normalized), redirects);
  return pages.find((page) => page.title === finalTitle);
}

function plainText(html: string | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

async function fileCredits(
  fileName: string,
): Promise<{ author: string | null; license: string | null; pageUrl: string | null }> {
  const data = await cached(`commons:${fileName}`, TTL.day, () =>
    fetchJson<CommonsResponse>(
      `${COMMONS_API}?${new URLSearchParams({
        action: "query",
        titles: `File:${fileName}`,
        prop: "imageinfo",
        iiprop: "extmetadata|url",
        format: "json",
        formatversion: "2",
      })}`,
      { revalidate: DATA_CACHE_SECONDS.commons },
    ),
  );

  const info = data?.query?.pages?.[0]?.imageinfo?.[0];
  return {
    author: plainText(info?.extmetadata?.Artist?.value),
    license: plainText(info?.extmetadata?.LicenseShortName?.value),
    pageUrl: info?.descriptionurl ?? null,
  };
}

async function searchLanguage(
  language: "pt" | "en",
  titles: string[],
): Promise<ImageInsight | null> {
  if (titles.length === 0) return null;

  const data = await fetchJson<WikiPagesResponse>(
    `https://${language}.wikipedia.org/w/api.php?${new URLSearchParams({
      action: "query",
      prop: "pageimages",
      piprop: "thumbnail|original|name",
      pithumbsize: String(THUMB_WIDTH),
      redirects: "1",
      titles: titles.join("|"),
      format: "json",
      formatversion: "2",
    })}`,
    { revalidate: DATA_CACHE_SECONDS.wikipedia },
  );
  if (!data) return null;

  for (const title of titles) {
    const page = pageFor(title, data);
    const source = page?.thumbnail?.source ?? page?.original?.source;
    if (!page || page.missing || !source || isSvg(source) || isSvg(page.pageimage ?? "")) continue;
    const url = withoutTracking(source);

    const credits = page.pageimage ? await fileCredits(page.pageimage) : null;
    return {
      url,
      source: "Wikipedia",
      attribution: credits?.author ?? null,
      license: credits?.license ?? null,
      pageUrl:
        credits?.pageUrl ?? `https://${language}.wikipedia.org/wiki/${encodeURIComponent((page.title ?? title).replace(/ /g, "_"))}`,
    };
  }
  return null;
}

/** Imagem sugerida para o destino; `null` se nenhuma página tiver foto utilizável. */
export function getDestinationImage(query: ImageQuery): Promise<ImageInsight | null> {
  const key = `image:${[query.name, query.region, query.municipality, query.country, query.isCountry, query.capital].join("|").toLowerCase()}`;

  return cached(key, TTL.day, async () => {
    return (
      (await searchLanguage("pt", candidates(query, "pt"))) ??
      (await searchLanguage("en", candidates(query, "en")))
    );
  });
}
