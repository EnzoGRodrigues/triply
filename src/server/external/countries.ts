import countries from "world-countries";

import type { CountryInsight } from "@/types/api";

/**
 * País → nome em português, moeda e bandeira, a partir do dataset estático
 * `world-countries` (a REST Countries v3.1 foi desativada). Sem chamada de rede.
 */

export interface CountryData {
  code: string;
  /** Nome em português (`translations.por.common`). */
  name: string;
  /** Nome em inglês (para a en.wikipedia). */
  englishName: string;
  /** Capital (em inglês), usada como fallback de imagem para destinos que são países. */
  capital: string | null;
  /** Moeda principal (primeira chave de `currencies`) ou `null`. */
  currencyCode: string | null;
  currencySymbol: string | null;
}

let byCode: Map<string, CountryData> | undefined;

function index(): Map<string, CountryData> {
  if (byCode) return byCode;
  byCode = new Map();
  for (const country of countries) {
    const [currencyCode] = Object.keys(country.currencies ?? {});
    byCode.set(country.cca2, {
      code: country.cca2,
      name: country.translations.por?.common ?? country.name.common,
      englishName: country.name.common,
      capital: country.capital?.[0] ?? null,
      currencyCode: currencyCode ?? null,
      currencySymbol: currencyCode ? (country.currencies[currencyCode]?.symbol ?? null) : null,
    });
  }
  return byCode;
}

export function getCountry(code: string | null | undefined): CountryData | null {
  if (!code) return null;
  return index().get(code.toUpperCase()) ?? null;
}

export function flagUrl(code: string): string {
  return `https://flagcdn.com/w320/${code.toLowerCase()}.png`;
}

export function getCountryInsight(code: string | null | undefined): CountryInsight | null {
  const country = getCountry(code);
  if (!country) return null;
  return { code: country.code, name: country.name, flagUrl: flagUrl(country.code) };
}

/** Nome da moeda em português ("peso mexicano") e símbolo, via Intl com fallback no dataset. */
export function describeCurrency(code: string): { name: string | null; symbol: string | null } {
  let name: string | null = null;
  let symbol: string | null = null;

  try {
    name = new Intl.DisplayNames(["pt-BR"], { type: "currency" }).of(code) ?? null;
    if (name === code) name = null;
  } catch {
    name = null;
  }
  try {
    symbol =
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: code })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? null;
  } catch {
    symbol = null;
  }

  if (!symbol) {
    const fromDataset = [...index().values()].find((c) => c.currencyCode === code);
    symbol = fromDataset?.currencySymbol ?? null;
  }
  return { name, symbol };
}
