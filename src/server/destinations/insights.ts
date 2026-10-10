import { getCountry, getCountryInsight } from "@/server/external/countries";
import { getCurrencyInsight } from "@/server/external/exchange";
import { cityFromLabel, resolvePlace, type Place } from "@/server/external/geocoding";
import { withDeadline } from "@/server/external/http";
import { getDestinationImage } from "@/server/external/image";
import { getClimate } from "@/server/external/weather";
import type { DestinationInsightsResponse } from "@/types/api";

export interface InsightsQuery {
  /** Nome ou rótulo do destino ("Natal", "Natal - Rio Grande do Norte", "Tulum, México"). */
  name?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** "YYYY-MM-DD" */
  start?: string | null;
  end?: string | null;
}

interface InsightsOptions {
  /** Prazo por bloco; passado dele o bloco vira `null` (a chamada continua e aquece o cache). */
  deadlineMs?: number;
  /** Usa as coordenadas do lugar encontrado quando `latitude/longitude` não vierem. */
  usePlaceCoordinates?: boolean;
}

/**
 * Reúne país, moeda/cotação, clima e imagem de um destino. Cada bloco falha de
 * forma independente (vira `null`): uma API externa fora do ar nunca derruba o resto.
 */
export async function getDestinationInsights(
  query: InsightsQuery,
  { deadlineMs = 10_000, usePlaceCoordinates = true }: InsightsOptions = {},
): Promise<DestinationInsightsResponse> {
  const hasCoordinates = query.latitude != null && query.longitude != null;
  const name = query.name?.trim() || null;

  // O lugar (estado, município, país) desambigua a imagem e completa o país.
  const placeTask: Promise<Place | null> = name
    ? withDeadline(
        resolvePlace({
          name,
          countryCode: query.countryCode,
          latitude: query.latitude,
          longitude: query.longitude,
        }),
        deadlineMs,
      )
    : Promise.resolve(null);

  const countryCodeTask = async () =>
    query.countryCode?.toUpperCase() ?? (await placeTask)?.countryCode ?? null;

  const currencyTask = async () => {
    const currencyCode = getCountry(await countryCodeTask())?.currencyCode;
    return currencyCode ? withDeadline(getCurrencyInsight(currencyCode), deadlineMs) : null;
  };

  const climateTask = async () => {
    let latitude = query.latitude;
    let longitude = query.longitude;
    if (!hasCoordinates && usePlaceCoordinates) {
      const place = await placeTask;
      latitude = place?.latitude;
      longitude = place?.longitude;
    }
    if (latitude == null || longitude == null) return null;
    return withDeadline(
      getClimate({ latitude, longitude, start: query.start, end: query.end }),
      deadlineMs,
    );
  };

  const imageTask = async () => {
    const place = await placeTask;
    const country = getCountry(place?.countryCode ?? (await countryCodeTask()));
    const isCountry = place?.isCountry ?? !name;
    const title = place?.name ?? (name ? cityFromLabel(name) : country?.name);
    if (!title) return null;

    return withDeadline(
      getDestinationImage({
        name: title,
        region: place?.admin1,
        municipality: place?.admin2,
        country: country?.name ?? place?.country,
        countryEnglish: country?.englishName,
        capital: country?.capital,
        isCountry,
      }),
      deadlineMs,
    );
  };

  const [countryCode, currency, climate, image] = await Promise.all([
    countryCodeTask(),
    currencyTask(),
    climateTask(),
    imageTask(),
  ]);

  return {
    country: getCountryInsight(countryCode),
    currency,
    climate,
    image,
  };
}
