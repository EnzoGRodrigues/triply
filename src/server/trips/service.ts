import { repos } from "@/db";
import type { TripFields, TripPatch, TripRecord, TripReport } from "@/db/types";
import { apiErrors } from "@/server/http/errors";
import type { TripStatus } from "@/types/api";

import { toTripCover } from "./cover";
import { enrichNewTrip, enrichUpdatedTrip } from "./enrich";
import {
  rangeIssues,
  type CompleteTripsData,
  type TripInputData,
  type TripReportData,
  type TripUpdateData,
} from "./schemas";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TRIP_NOT_FOUND = "Viagem não encontrada.";

/** Id malformado nunca existe: responde 404 em vez de perguntar ao banco. */
function assertTripId(id: string): void {
  if (!UUID_RE.test(id)) throw apiErrors.notFound(TRIP_NOT_FOUND);
}

/** Campos de `TripInput` → registro. Chaves ausentes (`undefined`) ficam de fora. */
function inputToValues(input: TripInputData | TripUpdateData): TripPatch {
  const values: TripPatch = {};

  if (input.destination !== undefined) values.destination = input.destination;
  if (input.city !== undefined) values.city = input.city;
  if (input.region !== undefined) values.region = input.region;
  if (input.country !== undefined) values.country = input.country;
  if (input.countryCode !== undefined) values.countryCode = input.countryCode;
  if (input.latitude !== undefined) values.latitude = input.latitude;
  if (input.longitude !== undefined) values.longitude = input.longitude;
  if (input.startDate !== undefined) values.startDate = input.startDate;
  if (input.endDate !== undefined) values.endDate = input.endDate;
  if (input.accommodation !== undefined) values.accommodation = input.accommodation;
  if (input.activities !== undefined) values.activities = input.activities;
  if (input.transport !== undefined) values.transport = input.transport;
  if (input.currencyCode !== undefined) values.currencyCode = input.currencyCode;
  if (input.exchangeRate !== undefined) values.exchangeRate = input.exchangeRate;
  if (input.tempMin !== undefined) values.tempMin = input.tempMin;
  if (input.tempMax !== undefined) values.tempMax = input.tempMax;

  if (input.coverImage !== undefined) {
    values.cover = toTripCover(input.coverImage, input.coverImageSource);
  }

  return values;
}

/** Valores do cliente vencem; o que veio vazio (`null`/ausente) é completado pelo enriquecimento. */
function withEnrichment(values: TripPatch, enrichment: TripPatch): TripPatch {
  const merged: Record<string, unknown> = { ...values };
  for (const [key, value] of Object.entries(enrichment)) {
    if (merged[key] === undefined || merged[key] === null) merged[key] = value;
  }
  return merged as TripPatch;
}

function reportToValues(report: Partial<TripReportData>): TripReport {
  const values: TripReport = {};
  if (report.rating !== undefined) values.rating = report.rating;
  if (report.companions !== undefined) values.companions = report.companions;
  if (report.expenses !== undefined) values.expenses = report.expenses;
  if (report.experience !== undefined) values.experience = report.experience;
  return values;
}

/* ───────────────────────── consultas ───────────────────────── */

export function listTrips(userId: string, status?: TripStatus): Promise<TripRecord[]> {
  return repos.trips.list(userId, status);
}

/** Busca uma viagem **do usuário**; viagem de outro usuário também dá 404. */
export async function getTrip(userId: string, id: string): Promise<TripRecord> {
  assertTripId(id);
  const trip = await repos.trips.find(userId, id);
  if (!trip) throw apiErrors.notFound(TRIP_NOT_FOUND);
  return trip;
}

export async function createTrip(userId: string, input: TripInputData): Promise<TripRecord> {
  // Completa moeda, temperatura e capa; falha de API externa não impede salvar.
  const enrichment = await enrichNewTrip(input);

  return repos.trips.create(userId, {
    ...withEnrichment(inputToValues(input), enrichment),
    destination: input.destination,
    status: "planejada",
  });
}

export async function updateTrip(
  userId: string,
  id: string,
  input: TripUpdateData,
): Promise<TripRecord> {
  const existing = await getTrip(userId, id);

  // Regras entre campos precisam considerar o que já está salvo.
  const issues = rangeIssues({
    startDate: input.startDate !== undefined ? input.startDate : existing.startDate,
    endDate: input.endDate !== undefined ? input.endDate : existing.endDate,
    tempMin: input.tempMin !== undefined ? input.tempMin : existing.tempMin,
    tempMax: input.tempMax !== undefined ? input.tempMax : existing.tempMax,
  });
  if (Object.keys(issues).length > 0) throw apiErrors.validation(issues);

  const report = reportToValues(input);
  const hasReportData = Object.values(report).some((value) => value !== null);
  if (existing.status === "planejada" && hasReportData) {
    throw apiErrors.validation(
      {
        ...(report.rating != null && { rating: "Só é possível avaliar viagens realizadas." }),
        ...(report.companions != null && { companions: "Só é possível informar a companhia de viagens realizadas." }),
        ...(report.expenses != null && { expenses: "Só é possível informar gastos de viagens realizadas." }),
        ...(report.experience != null && { experience: "Só é possível escrever o relato de viagens realizadas." }),
      },
      "Marque a viagem como realizada para registrar o relato.",
    );
  }

  const enrichment = await enrichUpdatedTrip(existing, input);

  const patch: TripPatch = {
    ...withEnrichment(inputToValues(input), enrichment),
    ...(report as Partial<TripFields>),
  };

  const updated = await repos.trips.update(userId, id, patch);
  if (!updated) throw apiErrors.notFound(TRIP_NOT_FOUND);
  return updated;
}

export async function deleteTrip(userId: string, id: string): Promise<void> {
  assertTripId(id);
  if (!(await repos.trips.remove(userId, id))) throw apiErrors.notFound(TRIP_NOT_FOUND);
}

/**
 * Marca várias viagens como realizadas (com o relato de cada uma) de forma atômica:
 * se alguma não existir/não for do usuário, nenhuma é alterada.
 * Devolve as viagens atualizadas na ordem em que foram enviadas.
 */
export async function completeTrips(
  userId: string,
  input: CompleteTripsData,
): Promise<TripRecord[]> {
  const updated = await repos.trips.complete(
    userId,
    input.trips.map(({ id, ...report }) => ({ id, report: reportToValues(report) })),
  );
  if (!updated) throw apiErrors.notFound(TRIP_NOT_FOUND);
  return updated;
}

/** Binário da capa enviada por upload (somente do dono da viagem). */
export async function getTripCover(userId: string, id: string) {
  assertTripId(id);
  const cover = await repos.trips.getCover(userId, id);
  if (!cover) throw apiErrors.notFound("Esta viagem não tem capa enviada.");
  return cover;
}
