import type { CurrencyInsight } from "@/types/api";

import { cached, DATA_CACHE_SECONDS, TTL } from "./cache";
import { describeCurrency } from "./countries";
import { fetchJson } from "./http";

/**
 * Cotação da moeda local → BRL.
 * Cadeia: AwesomeAPI → ExchangeRate-API (open access) → Frankfurter.
 */

interface Quote {
  rate: number;
  updatedAt: Date;
  source: string;
  sourceUrl: string | null;
}

const CURRENCY_RE = /^[A-Z]{3}$/;

function validRate(value: unknown): number | null {
  const rate = typeof value === "string" ? Number(value) : value;
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : null;
}

async function fromAwesomeApi(code: string): Promise<Quote | null> {
  const data = await fetchJson<Record<string, { bid?: string; timestamp?: string }>>(
    `https://economia.awesomeapi.com.br/json/last/${code}-BRL`,
    { revalidate: DATA_CACHE_SECONDS.exchange },
  );
  const pair = data?.[`${code}BRL`];
  const rate = validRate(pair?.bid);
  if (!pair || rate === null) return null;

  const seconds = Number(pair.timestamp);
  return {
    rate,
    updatedAt: Number.isFinite(seconds) ? new Date(seconds * 1000) : new Date(),
    source: "AwesomeAPI",
    sourceUrl: "https://docs.awesomeapi.com.br/api-de-moedas",
  };
}

async function fromExchangeRateApi(code: string): Promise<Quote | null> {
  const data = await fetchJson<{
    result?: string;
    time_last_update_unix?: number;
    rates?: Record<string, number>;
  }>(`https://open.er-api.com/v6/latest/${code}`, { revalidate: DATA_CACHE_SECONDS.exchange });
  const rate = validRate(data?.rates?.BRL);
  if (!data || data.result !== "success" || rate === null) return null;

  return {
    rate,
    updatedAt: data.time_last_update_unix ? new Date(data.time_last_update_unix * 1000) : new Date(),
    source: "ExchangeRate-API",
    sourceUrl: "https://www.exchangerate-api.com",
  };
}

async function fromFrankfurter(code: string): Promise<Quote | null> {
  const data = await fetchJson<{ date?: string; rates?: Record<string, number> }>(
    `https://api.frankfurter.dev/v1/latest?base=${code}&symbols=BRL`,
    { revalidate: DATA_CACHE_SECONDS.exchange },
  );
  const rate = validRate(data?.rates?.BRL);
  if (!data || rate === null) return null;

  const updatedAt = data.date ? new Date(`${data.date}T00:00:00Z`) : new Date();
  return {
    rate,
    updatedAt: Number.isNaN(updatedAt.getTime()) ? new Date() : updatedAt,
    source: "Frankfurter (BCE)",
    sourceUrl: "https://frankfurter.dev",
  };
}

/** "R$ 6,27" — com mais casas quando a cotação é pequena (ex.: IDR → "R$ 0,00028"). */
export function formatBRL(value: number): string {
  const significantDecimals = value >= 0.1 ? 2 : Math.min(6, Math.ceil(-Math.log10(value)) + 1);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.max(2, significantDecimals),
  }).format(value);
}

function toInsight(code: string, quote: Quote): CurrencyInsight {
  const rate = Math.round(quote.rate * 1e6) / 1e6; // NUMERIC(14,6)
  const { name, symbol } = describeCurrency(code);
  return {
    code,
    name,
    symbol,
    rateToBRL: rate,
    label: code === "BRL" ? formatBRL(1) : `1 ${code} = ${formatBRL(rate)}`,
    updatedAt: quote.updatedAt.toISOString(),
    source: quote.source,
    sourceUrl: quote.sourceUrl,
  };
}

/** Cotação de 1 unidade da moeda em reais; `null` se nenhuma fonte responder. */
export function getCurrencyInsight(currencyCode: string): Promise<CurrencyInsight | null> {
  const code = currencyCode.trim().toUpperCase();
  if (!CURRENCY_RE.test(code)) return Promise.resolve(null);

  if (code === "BRL") {
    // Sem chamada externa.
    return Promise.resolve(
      toInsight(code, { rate: 1, updatedAt: new Date(), source: "Real brasileiro", sourceUrl: null }),
    );
  }

  return cached(`fx:${code}`, TTL.hour, async () => {
    for (const lookup of [fromAwesomeApi, fromExchangeRateApi, fromFrankfurter]) {
      const quote = await lookup(code);
      if (quote) return toInsight(code, quote);
    }
    return null;
  });
}
