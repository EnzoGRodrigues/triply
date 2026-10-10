import type { DestinationResult } from "@/types/api";

import { cached, DATA_CACHE_SECONDS, TTL } from "./cache";
import { getCountry } from "./countries";
import { fetchJson } from "./http";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
/** Quantos resultados pedir à API (o lugar famoso pode estar longe do topo da ordem dela)... */
const RESULTS_FETCHED = 40;
/** ...e quantos devolver ao usuário depois de ranquear. */
const RESULTS_RETURNED = 8;

interface GeocodingApiResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  feature_code?: string;
  country_code?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  population?: number;
}

interface GeocodingApiResponse {
  results?: GeocodingApiResult[];
}

/** Lugar já normalizado; guarda `admin2` (município) para o fallback de imagem. */
export interface Place {
  id: string;
  name: string;
  admin1: string | null;
  admin2: string | null;
  country: string | null;
  countryCode: string | null;
  latitude: number;
  longitude: number;
  /** O resultado é o próprio país (feature code `PCL*`). */
  isCountry: boolean;
}

function toPlace(raw: GeocodingApiResult): Place {
  const countryCode = raw.country_code?.toUpperCase() ?? null;
  const isCountry = raw.feature_code?.startsWith("PCL") ?? false;
  const country = getCountry(countryCode)?.name ?? raw.country ?? null;

  return {
    id: String(raw.id),
    name: isCountry ? (country ?? raw.name) : raw.name,
    admin1: !isCountry && raw.admin1 && raw.admin1 !== raw.name ? raw.admin1 : null,
    admin2: !isCountry && raw.admin2 && raw.admin2 !== raw.name ? raw.admin2 : null,
    country,
    countryCode,
    latitude: raw.latitude,
    longitude: raw.longitude,
    isCountry,
  };
}

/** Minúsculas e sem acentos, para comparar nomes ("Bāli" = "bali"). */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Só lugares onde alguém viaja: cidades/vilas (PPL*), ilhas, países, estados e regiões/resorts.
 * Fica de fora o ruído (aeroportos, montes, parques, pontos de interesse).
 */
const DESTINATION_FEATURE = /^(PPL[A-Z0-9]*|ISLS?|PCL[A-Z]*|ADM1|RGN|RSRT)$/;

/** Bônus de "importância" do tipo de lugar: capitais e sedes pesam mais que lugarejos. */
const FEATURE_BONUS: Record<string, number> = {
  PCLI: 3, // país
  PPLC: 2.5, // capital
  PPLA: 1.5, // sede de estado/província
  ISL: 1.5, // ilha (Bali, Fernando de Noronha...)
  PPLA2: 1, // sede de município
  ADM1: 0.8, // estado/região
  PPLA3: 0.5,
  RGN: 0.5,
  RSRT: 0.5,
  PPLA4: 0.3,
};

/** Variações que a Open-Meteo não resolve sozinha (ex.: "Nova York" só acha o município do Maranhão). */
const QUERY_ALIASES: Record<string, string[]> = {
  "nova york": ["nyc"],
  "new york": ["nyc"],
};

/**
 * Pontuação = relevância do nome + importância do lugar + um pequeno bônus pela
 * ordem original da API (desempata homônimos sem população, como os vários "Gramado"):
 *  - nome: igual ao digitado 5 · começa com ele no meio de uma palavra 3 (quem está digitando
 *    "madri" quer "Madrid") · começa com ele como palavra inteira 1,5 (é outro lugar: "Gramado
 *    Xavier", "Bangkok Noi") · contém 1 · outro 0,5 (a API achou por um nome alternativo,
 *    ex.: "Bangkok" → "Banguecoque");
 *  - importância: log10(população) + bônus do tipo de lugar (capital, sede, ilha, país),
 *    reduzida a 60% para "outro lugar de mesmo prefixo";
 *  - sede do município (`admin2` igual ao nome) ganha um bônus quando o nome bate;
 *  - ordem: de 1 (1º da API) até 0.
 * Assim cidades e capitais famosas vêm antes de lugarejos homônimos, e "Banguecoque",
 * "Madrid" ou "Tóquio" aparecem mesmo quando se digita o nome internacional.
 */
function score(result: GeocodingApiResult, index: number, wanted: string): number {
  const name = normalize(result.name);
  const exact = name === wanted;
  const startsWith = !exact && name.startsWith(wanted);
  const wholeWordPrefix = startsWith && /[\s\-,/(]/.test(name.charAt(wanted.length));
  const partialPrefix = startsWith && !wholeWordPrefix;

  const relevance = exact
    ? 5
    : partialPrefix
      ? 3
      : wholeWordPrefix
        ? 1.5
        : name.includes(wanted)
          ? 1
          : 0.5;

  const population = result.population && result.population > 0 ? Math.log10(result.population) : 0;
  const importance =
    (population + (FEATURE_BONUS[result.feature_code ?? ""] ?? 0)) * (wholeWordPrefix ? 0.6 : 1);

  const isSeat =
    (exact || partialPrefix) && !!result.admin2 && normalize(result.admin2) === name ? 1.5 : 0;
  const order = Math.max(0, 1 - index * 0.04);
  return relevance + importance + isSeat + order;
}

function rankResults(results: GeocodingApiResult[], query: string): GeocodingApiResult[] {
  const wanted = normalize(query);
  const scored = results
    .map((result, index) => ({ result, index, score: score(result, index, wanted) }))
    .filter(({ result }) => !result.feature_code || DESTINATION_FEATURE.test(result.feature_code));

  // Corta o ruído de baixa relevância quando há resultados claramente melhores.
  const best = Math.max(0, ...scored.map((item) => item.score));
  return scored
    .filter((item) => item.score >= best * 0.2)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ result }) => result);
}

/** Resultados brutos (sem ranquear) de uma consulta; `null` se a API falhar. */
function fetchRaw(name: string): Promise<GeocodingApiResult[] | null> {
  return cached(`geocoding:v2:${name.toLowerCase()}`, TTL.day, async () => {
    const url = `${GEOCODING_URL}?${new URLSearchParams({
      name,
      count: String(RESULTS_FETCHED),
      language: "pt",
      format: "json",
    })}`;
    const data = await fetchJson<GeocodingApiResponse>(url, { revalidate: DATA_CACHE_SECONDS.geocoding });
    return data ? (data.results ?? []) : null;
  });
}

/**
 * Busca lugares pelo nome e ranqueia (melhores primeiro). `null` se a API falhar;
 * lista vazia se não achar nada.
 */
export async function searchPlaces(query: string): Promise<Place[] | null> {
  const name = query.trim();
  const variants = [name, ...(QUERY_ALIASES[normalize(name)] ?? [])];

  const [primary, ...extras] = await Promise.all(variants.map(fetchRaw));
  if (primary === null) return null;

  const seen = new Set<number>();
  const merged = [primary, ...extras]
    .flatMap((list) => list ?? [])
    .filter((result) => !seen.has(result.id) && seen.add(result.id));

  return rankResults(merged, name).map(toPlace);
}

/**
 * Rótulo pronto para exibir e usar como `destination`:
 * Brasil → "Barra Grande - Piauí"; exterior → "Tulum, México"; país → "México".
 */
export function placeLabel(place: Place): string {
  if (place.isCountry) return place.name;
  if (place.countryCode === "BR") {
    return place.admin1 ? `${place.name} - ${place.admin1}` : place.name;
  }
  return place.country ? `${place.name}, ${place.country}` : place.name;
}

export function toDestinationResult(place: Place): DestinationResult {
  return {
    id: place.id,
    name: place.name,
    region: place.admin1,
    country: place.country,
    countryCode: place.countryCode,
    latitude: place.latitude,
    longitude: place.longitude,
    label: placeLabel(place),
  };
}

/** Autocomplete de destinos. `null` se o serviço estiver indisponível. */
export async function searchDestinations(query: string): Promise<DestinationResult[] | null> {
  const places = await searchPlaces(query);
  if (!places) return null;

  const seen = new Set<string>();
  const results: DestinationResult[] = [];
  for (const place of places) {
    const result = toDestinationResult(place);
    const key = result.label.toLowerCase();
    if (seen.has(key)) continue; // dois "Barra Grande - Piauí" confundiriam o usuário
    seen.add(key);
    results.push(result);
    if (results.length === RESULTS_RETURNED) break;
  }
  return results;
}

export interface PlaceHint {
  /** Nome ou rótulo do destino ("Natal", "Natal - Rio Grande do Norte", "Tulum, México"). */
  name?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Separa um rótulo em cidade e qualificador:
 * "Natal - Rio Grande do Norte" → ["Natal", "Rio Grande do Norte"]; "Tulum, México" → ["Tulum", "México"].
 */
function splitLabel(label: string): { city: string; qualifier: string | null } {
  const [city, ...rest] = label.split(/\s+-\s+|,/);
  return { city: city.trim(), qualifier: rest.join(" ").trim() || null };
}

/** Só o nome da cidade: "Natal - Rio Grande do Norte" → "Natal"; "Tulum, México" → "Tulum". */
export function cityFromLabel(label: string): string {
  return splitLabel(label).city;
}

/**
 * Descobre qual lugar o cliente quis dizer (região/município/país), usando o
 * nome e, quando houver, país, coordenadas e o estado/país do rótulo para
 * escolher entre homônimos.
 */
export async function resolvePlace(hint: PlaceHint): Promise<Place | null> {
  const { city, qualifier } = splitLabel(hint.name ?? "");
  if (city.length < 2) return null;

  const places = await searchPlaces(city);
  if (!places || places.length === 0) return null;

  const countryCode = hint.countryCode?.toUpperCase();
  let candidates = countryCode
    ? places.filter((place) => place.countryCode === countryCode)
    : places;
  if (candidates.length === 0) return null;

  if (qualifier) {
    const wanted = normalize(qualifier);
    const qualified = candidates.filter(
      (place) =>
        (place.admin1 && normalize(place.admin1) === wanted) ||
        (place.country && normalize(place.country) === wanted),
    );
    if (qualified.length > 0) candidates = qualified;
  }

  const { latitude, longitude } = hint;
  if (latitude == null || longitude == null) return candidates[0];

  const distance = (place: Place) =>
    (place.latitude - latitude) ** 2 + (place.longitude - longitude) ** 2;
  const nearest = candidates.reduce((best, place) =>
    distance(place) < distance(best) ? place : best,
  );
  // Longe demais (> ~1°) = não é o mesmo lugar.
  return distance(nearest) <= 1 ? nearest : null;
}
