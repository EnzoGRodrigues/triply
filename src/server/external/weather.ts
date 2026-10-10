import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, subYears } from "date-fns";

import type { ClimateInsight } from "@/types/api";

import { cached, DATA_CACHE_SECONDS, TTL } from "./cache";
import { fetchJson } from "./http";

/**
 * Temperatura média do período (Open-Meteo, sem chave):
 * - todo o período nos próximos 16 dias → Forecast ("previsao");
 * - período passado com dados no Archive → Archive nas datas exatas ("historico");
 * - senão → Archive nas mesmas datas do ano anterior ("historico"); se esse período
 *   ainda não aconteceu (viagem daqui a mais de um ano), usa o último ano já completo;
 * - sem datas → Forecast dos próximos 7 dias.
 */

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

const FORECAST_HORIZON_DAYS = 16;
const MAX_PERIOD_DAYS = 31;
/** O Archive tem alguns dias de atraso: só confiamos em períodos que terminaram há mais que isso. */
const ARCHIVE_LAG_DAYS = 7;
const DEFAULT_WINDOW_DAYS = 7;
const MAX_YEARS_BACK = 5;

interface DailyResponse {
  daily?: {
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
  };
}

export interface ClimateQuery {
  latitude: number;
  longitude: number;
  /** "YYYY-MM-DD" */
  start?: string | null;
  end?: string | null;
}

const isoDay = (date: Date) => format(date, "yyyy-MM-dd");

function average(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

async function dailyRange(
  baseUrl: string,
  { latitude, longitude }: Pick<ClimateQuery, "latitude" | "longitude">,
  start: string,
  end: string,
): Promise<{ min: number; max: number } | null> {
  const key = `weather:${baseUrl}:${latitude.toFixed(2)}:${longitude.toFixed(2)}:${start}:${end}`;

  return cached(key, TTL.sixHours, async () => {
    const url = `${baseUrl}?${new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      daily: "temperature_2m_max,temperature_2m_min",
      timezone: "auto",
      start_date: start,
      end_date: end,
    })}`;
    const data = await fetchJson<DailyResponse>(url, {
      revalidate: baseUrl === ARCHIVE_URL ? DATA_CACHE_SECONDS.archive : DATA_CACHE_SECONDS.forecast,
    });

    // Dias sem previsão/dado vêm `null`: ficam de fora da média.
    const min = average(data?.daily?.temperature_2m_min ?? []);
    const max = average(data?.daily?.temperature_2m_max ?? []);
    if (min === null || max === null) return null;
    return { min, max };
  });
}

/** "≈ 20 °C" quando mínima e máxima arredondam igual; senão "≈ 25 a 30 °C". */
export function climateLabel(min: number, max: number): string {
  const low = Math.round(min);
  const high = Math.round(max);
  return low === high ? `≈ ${low} °C` : `≈ ${low} a ${high} °C`;
}

function toInsight(
  range: { min: number; max: number },
  source: ClimateInsight["source"],
): ClimateInsight {
  const min = round1(range.min);
  const max = round1(range.max);
  return { min, max, label: climateLabel(min, max), source };
}

export async function getClimate(query: ClimateQuery): Promise<ClimateInsight | null> {
  const today = startOfDay(new Date());
  const coords = { latitude: query.latitude, longitude: query.longitude };

  const rawStart = query.start ?? query.end;
  const rawEnd = query.end ?? query.start;

  // Sem datas: próximos 7 dias.
  if (!rawStart || !rawEnd) {
    const range = await dailyRange(
      FORECAST_URL,
      coords,
      isoDay(today),
      isoDay(addDays(today, DEFAULT_WINDOW_DAYS - 1)),
    );
    return range && toInsight(range, "previsao");
  }

  const start = parseISO(rawStart);
  let end = parseISO(rawEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  // Limita o período consultado (e o custo da consulta).
  if (differenceInCalendarDays(end, start) >= MAX_PERIOD_DAYS) {
    end = addDays(start, MAX_PERIOD_DAYS - 1);
  }

  const startsInHorizon = differenceInCalendarDays(start, today) >= 0;
  const endsInHorizon = differenceInCalendarDays(end, today) <= FORECAST_HORIZON_DAYS;
  if (startsInHorizon && endsInHorizon) {
    const range = await dailyRange(FORECAST_URL, coords, isoDay(start), isoDay(end));
    if (range) return toInsight(range, "previsao");
    // Previsão indisponível: cai para o histórico do ano anterior.
  }

  // Período que já terminou (com folga p/ o atraso do Archive): dados reais.
  const hasPassed = (periodEnd: Date) =>
    differenceInCalendarDays(today, periodEnd) > ARCHIVE_LAG_DAYS;

  let from = start;
  let to = end;
  if (!hasPassed(end)) {
    // Mesmas datas de um ano anterior que já tenha acontecido por inteiro.
    let yearsBack = 1;
    while (!hasPassed(subYears(end, yearsBack)) && yearsBack < MAX_YEARS_BACK) yearsBack++;
    from = subYears(start, yearsBack);
    to = subYears(end, yearsBack);
  }

  const range = await dailyRange(ARCHIVE_URL, coords, isoDay(from), isoDay(to));
  return range && toInsight(range, "historico");
}
