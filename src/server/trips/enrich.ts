import type { TripPatch, TripRecord } from "@/db/types";
import { getDestinationInsights } from "@/server/destinations/insights";
import { getCountry } from "@/server/external/countries";
import { getCurrencyInsight } from "@/server/external/exchange";
import { withDeadline } from "@/server/external/http";
import type { DestinationInsightsResponse } from "@/types/api";

import type { TripInputData, TripUpdateData } from "./schemas";

/**
 * Enriquecimento automático (SPEC §5): ao criar/editar uma viagem de destino
 * geolocalizado, completa moeda/cotação, temperatura e capa quando vierem vazias
 * (ou quando destino/datas mudarem). Falha de API externa NUNCA impede salvar:
 * qualquer erro ou estouro de prazo devolve `{}` e a viagem é salva como veio.
 */

const ENRICHMENT_BUDGET_MS = 8_000;

type EnrichmentValues = TripPatch;

/** O que deve ser (re)buscado. */
interface Wants {
  /** Código da moeda a cotar, ou `null` para não buscar cotação. */
  currencyCode: string | null;
  climate: boolean;
  image: boolean;
}

interface Target {
  destination: string;
  city: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  startDate: string | null;
  endDate: string | null;
}

const isBlank = (value: unknown): boolean => value === undefined || value === null;

/** Destino geolocalizado = tem coordenadas ou país. */
function isGeolocated(target: Target): boolean {
  return (
    (target.latitude !== null && target.longitude !== null) || target.countryCode !== null
  );
}

async function fetchEnrichment(
  target: Target,
  wants: Wants,
): Promise<EnrichmentValues> {
  const values: EnrichmentValues = {};

  const tasks: Array<Promise<void>> = [];

  // Só cotação com um código já conhecido: dispensa o serviço de insights.
  if (wants.currencyCode) {
    tasks.push(
      getCurrencyInsight(wants.currencyCode).then((currency) => {
        if (!currency) return;
        values.currencyCode = currency.code;
        values.exchangeRate = currency.rateToBRL;
        values.exchangeRateAt = new Date(currency.updatedAt);
      }),
    );
  }

  if (wants.climate || wants.image) {
    const insights: Promise<DestinationInsightsResponse> = getDestinationInsights(
      {
        name: target.city ?? target.destination,
        countryCode: target.countryCode,
        latitude: target.latitude,
        longitude: target.longitude,
        start: target.startDate,
        end: target.endDate,
      },
      // Não inventa coordenadas: sem lat/lon do cliente, não há clima.
      { usePlaceCoordinates: false },
    );

    tasks.push(
      insights.then(({ climate, image }) => {
        if (wants.climate && climate) {
          values.tempMin = climate.min;
          values.tempMax = climate.max;
        }
        if (wants.image && image) {
          values.cover = { kind: "external", url: image.url, source: "wikipedia" };
        }
      }),
    );
  }

  await Promise.allSettled(tasks);
  return values;
}

/** Roda a busca dentro do orçamento de tempo; qualquer problema vira "nada a completar". */
async function withinBudget(target: Target, wants: Wants): Promise<EnrichmentValues> {
  if (!wants.currencyCode && !wants.climate && !wants.image) return {};
  try {
    const result = await withDeadline(fetchEnrichment(target, wants), ENRICHMENT_BUDGET_MS);
    return result ?? {};
  } catch (error) {
    console.warn("[enrich] falha ao enriquecer viagem:", error);
    return {};
  }
}

/** Nome do país a partir do código, sem rede, quando o cliente não mandou. */
function countryName(
  countryCode: string | null,
  country: string | null | undefined,
): EnrichmentValues {
  if (country || !countryCode) return {};
  const name = getCountry(countryCode)?.name;
  return name ? { country: name } : {};
}

/** POST /api/trips */
export async function enrichNewTrip(input: TripInputData): Promise<EnrichmentValues> {
  const target: Target = {
    destination: input.destination,
    city: input.city ?? null,
    countryCode: input.countryCode ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
  };
  if (!isGeolocated(target)) return {};

  const offline = countryName(target.countryCode, input.country);

  const clientManagesRate = !isBlank(input.currencyCode) && !isBlank(input.exchangeRate);
  const currencyCode = clientManagesRate
    ? null
    : (input.currencyCode ?? getCountry(target.countryCode)?.currencyCode ?? null);

  const fetched = await withinBudget(target, {
    currencyCode,
    climate:
      isBlank(input.tempMin) &&
      isBlank(input.tempMax) &&
      target.latitude !== null &&
      target.longitude !== null,
    // `coverImage: null` = o usuário não quer capa; omitido = busca automática.
    image: input.coverImage === undefined,
  });

  return { ...offline, ...fetched };
}

/** PATCH /api/trips/{id}: `existing` é a viagem já salva, `input` o que veio no PATCH. */
export async function enrichUpdatedTrip(
  existing: TripRecord,
  input: TripUpdateData,
): Promise<EnrichmentValues> {
  const pick = <T>(sent: T | undefined, saved: T): T => (sent !== undefined ? sent : saved);

  const target: Target = {
    destination: pick(input.destination, existing.destination),
    city: pick(input.city, existing.city),
    countryCode: pick(input.countryCode, existing.countryCode),
    latitude: pick(input.latitude, existing.latitude),
    longitude: pick(input.longitude, existing.longitude),
    startDate: pick(input.startDate, existing.startDate),
    endDate: pick(input.endDate, existing.endDate),
  };
  if (!isGeolocated(target)) return {};

  const changed = <K extends keyof TripRecord & keyof TripUpdateData>(key: K) =>
    input[key] !== undefined && input[key] !== existing[key];

  const destinationChanged = (
    ["destination", "city", "region", "country", "countryCode", "latitude", "longitude"] as const
  ).some(changed);
  const datesChanged = changed("startDate") || changed("endDate");

  const offline = countryName(
    target.countryCode,
    pick(input.country, existing.country),
  );

  // Moeda: o que o cliente mandou vale; senão atualiza se o destino mudou ou se estava vazia.
  let currencyCode: string | null = null;
  if (input.exchangeRate === undefined) {
    if (input.currencyCode) {
      currencyCode = input.currencyCode;
    } else if (input.currencyCode === undefined) {
      const needsRate = destinationChanged || existing.exchangeRate === null;
      currencyCode = needsRate
        ? (getCountry(target.countryCode)?.currencyCode ?? existing.currencyCode)
        : null;
    }
  }

  const hasCoordinates = target.latitude !== null && target.longitude !== null;
  const climate =
    input.tempMin === undefined &&
    input.tempMax === undefined &&
    hasCoordinates &&
    (destinationChanged ||
      datesChanged ||
      (existing.tempMin === null && existing.tempMax === null));

  // Capa: só renova quando o destino muda e a capa atual é automática (Wikipedia ou URL);
  // o upload do usuário nunca é tocado, nem uma capa enviada neste mesmo PATCH.
  const image =
    input.coverImage === undefined &&
    destinationChanged &&
    existing.coverImageSource !== "upload";

  const fetched = await withinBudget(target, { currencyCode, climate, image });

  // Destino mudou e não achamos foto do novo (ou a busca falhou): remover a capa automática,
  // em vez de manter a foto do destino antigo.
  if (image && fetched.cover === undefined) fetched.cover = null;

  return { ...offline, ...fetched };
}
