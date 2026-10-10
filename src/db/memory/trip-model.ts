import { randomUUID } from "node:crypto";

import type {
  CoverUpload,
  NewTrip,
  TripCover,
  TripFields,
  TripPatch,
  TripRecord,
  TripReport,
} from "../types";
import { roundNullable } from "./numeric";

/** Viagem guardada: o registro + os bytes do upload (que nunca vão no registro). */
export interface StoredTrip {
  record: TripRecord;
  cover: CoverUpload | null;
}

function copyBytes(upload: CoverUpload): CoverUpload {
  return { mime: upload.mime, bytes: Buffer.from(upload.bytes) };
}

/** Aplica a capa: upload guarda os bytes; URL externa fica no registro; `null` remove. */
function applyCover(stored: StoredTrip, cover: TripCover): void {
  if (cover === null) {
    stored.record.coverImageSource = null;
    stored.record.coverExternalUrl = null;
    stored.cover = null;
  } else if (cover.kind === "upload") {
    stored.record.coverImageSource = "upload";
    stored.record.coverExternalUrl = null;
    stored.cover = copyBytes(cover);
  } else {
    stored.record.coverImageSource = cover.source;
    stored.record.coverExternalUrl = cover.url;
    stored.cover = null;
  }
}

/** Grava só o que veio definido (`undefined` = não mexe), arredondando como as colunas NUMERIC. */
function applyFields(target: TripFields, fields: Partial<TripFields>): void {
  if (fields.destination !== undefined) target.destination = fields.destination;
  if (fields.city !== undefined) target.city = fields.city;
  if (fields.region !== undefined) target.region = fields.region;
  if (fields.country !== undefined) target.country = fields.country;
  if (fields.countryCode !== undefined) target.countryCode = fields.countryCode;
  if (fields.latitude !== undefined) target.latitude = fields.latitude;
  if (fields.longitude !== undefined) target.longitude = fields.longitude;
  if (fields.startDate !== undefined) target.startDate = fields.startDate;
  if (fields.endDate !== undefined) target.endDate = fields.endDate;
  if (fields.accommodation !== undefined) target.accommodation = fields.accommodation;
  if (fields.activities !== undefined) target.activities = fields.activities;
  if (fields.transport !== undefined) target.transport = fields.transport;
  if (fields.currencyCode !== undefined) target.currencyCode = fields.currencyCode;
  if (fields.exchangeRate !== undefined) target.exchangeRate = roundNullable(fields.exchangeRate, 6);
  if (fields.exchangeRateAt !== undefined) target.exchangeRateAt = fields.exchangeRateAt;
  if (fields.tempMin !== undefined) target.tempMin = roundNullable(fields.tempMin, 1);
  if (fields.tempMax !== undefined) target.tempMax = roundNullable(fields.tempMax, 1);
  if (fields.rating !== undefined) target.rating = fields.rating;
  if (fields.companions !== undefined) target.companions = fields.companions;
  if (fields.expenses !== undefined) target.expenses = roundNullable(fields.expenses, 2);
  if (fields.experience !== undefined) target.experience = fields.experience;
}

export function createStoredTrip(userId: string, input: NewTrip): StoredTrip {
  const now = new Date();
  const stored: StoredTrip = {
    cover: null,
    record: {
      id: input.id ?? randomUUID(),
      userId,
      status: input.status ?? "planejada",
      destination: input.destination,
      city: null,
      region: null,
      country: null,
      countryCode: null,
      latitude: null,
      longitude: null,
      startDate: null,
      endDate: null,
      accommodation: null,
      activities: null,
      transport: "aviao",
      currencyCode: null,
      exchangeRate: null,
      exchangeRateAt: null,
      tempMin: null,
      tempMax: null,
      coverImageSource: null,
      coverExternalUrl: null,
      completedAt: input.completedAt ?? null,
      rating: null,
      companions: null,
      expenses: null,
      experience: null,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? input.createdAt ?? now,
    },
  };
  applyFields(stored.record, input);
  if (input.cover !== undefined) applyCover(stored, input.cover);
  return stored;
}

/** Atualização parcial; `updatedAt` muda sempre. */
export function patchStoredTrip(stored: StoredTrip, patch: TripPatch): void {
  applyFields(stored.record, patch);
  if (patch.cover !== undefined) applyCover(stored, patch.cover);
  stored.record.updatedAt = new Date();
}

/** Conclusão: relato + status; quem já era realizada mantém o `completedAt` original. */
export function completeStoredTrip(stored: StoredTrip, report: TripReport): void {
  applyFields(stored.record, report);
  const now = new Date();
  stored.record.status = "realizada";
  stored.record.completedAt ??= now;
  stored.record.updatedAt = now;
}

/** Cópia independente: quem recebe não consegue alterar o estado do banco por referência. */
export function cloneRecord(record: TripRecord): TripRecord {
  return structuredClone(record);
}

export { copyBytes };

/**
 * Mesma ordem da consulta SQL do Postgres: planejadas primeiro; planejadas por ida
 * crescente (sem data no fim); realizadas por conclusão decrescente; desempate por criação.
 */
export function compareTrips(a: TripRecord, b: TripRecord): number {
  const rank = (t: TripRecord) => (t.status === "planejada" ? 0 : 1);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);

  if (a.status === "planejada") {
    if (a.startDate !== b.startDate) {
      if (a.startDate === null) return 1;
      if (b.startDate === null) return -1;
      return a.startDate < b.startDate ? -1 : 1;
    }
  } else if (a.completedAt?.getTime() !== b.completedAt?.getTime()) {
    if (a.completedAt === null) return 1;
    if (b.completedAt === null) return -1;
    return b.completedAt.getTime() - a.completedAt.getTime();
  }
  return b.createdAt.getTime() - a.createdAt.getTime();
}
