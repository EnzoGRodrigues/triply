import type { TripRecord } from "@/db/types";
import type { Trip } from "@/types/api";

function coverImageUrl(row: TripRecord): string | null {
  if (row.coverImageSource === "upload") {
    return `/api/trips/${row.id}/cover?v=${row.updatedAt.getTime()}`;
  }
  return row.coverExternalUrl;
}

/** Registro do banco → `Trip` do contrato. */
export function serializeTrip(row: TripRecord): Trip {
  return {
    id: row.id,
    status: row.status,
    destination: row.destination,
    city: row.city,
    region: row.region,
    country: row.country,
    countryCode: row.countryCode,
    latitude: row.latitude,
    longitude: row.longitude,
    startDate: row.startDate,
    endDate: row.endDate,
    accommodation: row.accommodation,
    activities: row.activities,
    transport: row.transport,
    currencyCode: row.currencyCode,
    exchangeRate: row.exchangeRate,
    exchangeRateAt: row.exchangeRateAt?.toISOString() ?? null,
    tempMin: row.tempMin,
    tempMax: row.tempMax,
    coverImageUrl: coverImageUrl(row),
    coverImageSource: row.coverImageSource,
    completedAt: row.completedAt?.toISOString() ?? null,
    rating: row.rating,
    companions: row.companions,
    expenses: row.expenses,
    experience: row.experience,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
