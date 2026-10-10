import { and, asc, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";

import type { TripsRepository } from "../repositories";
import type {
  CoverUpload,
  ImageMime,
  NewTrip,
  TripCover,
  TripFields,
  TripPatch,
  TripRecord,
} from "../types";
import { getPostgres } from "./connection";
import { trips, type NewTripRow } from "./schema";

/* ───────────── colunas lidas ───────────── */

function omitKeys<T extends object, K extends keyof T>(source: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...source };
  for (const key of keys) delete copy[key];
  return copy;
}

/**
 * O `cover_image` (data URL de até ~2 MB) NUNCA vem nas consultas de viagem: só a URL
 * externa, quando houver. Os bytes do upload saem por `getCover`.
 */
const tripSelection = {
  ...omitKeys(getTableColumns(trips), "coverImage"),
  coverExternalUrl: sql<string | null>`case when ${trips.coverImageSource} = 'upload' then null else ${trips.coverImage} end`.as(
    "cover_external_url",
  ),
};

type TripSelectionRow = Omit<typeof trips.$inferSelect, "coverImage"> & {
  coverExternalUrl: string | null;
};

/** NUMERIC chega do driver como string; o registro quer `number`. */
const num = (value: string | null): number | null => (value === null ? null : Number(value));
const text = (value: number | null): string | null => (value === null ? null : String(value));

function toRecord(row: TripSelectionRow): TripRecord {
  return {
    ...row,
    exchangeRate: num(row.exchangeRate),
    tempMin: num(row.tempMin),
    tempMax: num(row.tempMax),
    expenses: num(row.expenses),
  };
}

/* ───────────── registro → colunas ───────────── */

/** Só o que veio definido (`undefined` = não mexe); números viram texto para as colunas NUMERIC. */
function fieldsToValues(fields: Partial<TripFields>): Partial<NewTripRow> {
  const values: Partial<NewTripRow> = {};
  if (fields.destination !== undefined) values.destination = fields.destination;
  if (fields.city !== undefined) values.city = fields.city;
  if (fields.region !== undefined) values.region = fields.region;
  if (fields.country !== undefined) values.country = fields.country;
  if (fields.countryCode !== undefined) values.countryCode = fields.countryCode;
  if (fields.latitude !== undefined) values.latitude = fields.latitude;
  if (fields.longitude !== undefined) values.longitude = fields.longitude;
  if (fields.startDate !== undefined) values.startDate = fields.startDate;
  if (fields.endDate !== undefined) values.endDate = fields.endDate;
  if (fields.accommodation !== undefined) values.accommodation = fields.accommodation;
  if (fields.activities !== undefined) values.activities = fields.activities;
  if (fields.transport !== undefined) values.transport = fields.transport;
  if (fields.currencyCode !== undefined) values.currencyCode = fields.currencyCode;
  if (fields.exchangeRate !== undefined) values.exchangeRate = text(fields.exchangeRate);
  if (fields.exchangeRateAt !== undefined) values.exchangeRateAt = fields.exchangeRateAt;
  if (fields.tempMin !== undefined) values.tempMin = text(fields.tempMin);
  if (fields.tempMax !== undefined) values.tempMax = text(fields.tempMax);
  if (fields.rating !== undefined) values.rating = fields.rating;
  if (fields.companions !== undefined) values.companions = fields.companions;
  if (fields.expenses !== undefined) values.expenses = text(fields.expenses);
  if (fields.experience !== undefined) values.experience = fields.experience;
  return values;
}

/* ───────────── capa ───────────── */

const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/;

/** Uploads ficam na coluna de texto como data URL (invariante: data URL ⇔ origem `upload`). */
function encodeDataUrl({ mime, bytes }: CoverUpload): string {
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

function decodeDataUrl(value: string): CoverUpload | null {
  const match = DATA_URL_RE.exec(value);
  return match ? { mime: match[1] as ImageMime, bytes: Buffer.from(match[2], "base64") } : null;
}

function coverToValues(cover: TripCover): Pick<NewTripRow, "coverImage" | "coverImageSource"> {
  if (cover === null) return { coverImage: null, coverImageSource: null };
  if (cover.kind === "upload") return { coverImage: encodeDataUrl(cover), coverImageSource: "upload" };
  return { coverImage: cover.url, coverImageSource: cover.source };
}

/** Valores de INSERT de uma viagem (também usado pelo seed). */
export function tripInsertValues(userId: string, trip: NewTrip): NewTripRow {
  return {
    ...fieldsToValues(trip),
    ...(trip.cover !== undefined && coverToValues(trip.cover)),
    ...(trip.id && { id: trip.id }),
    ...(trip.completedAt !== undefined && { completedAt: trip.completedAt }),
    ...(trip.createdAt && { createdAt: trip.createdAt }),
    ...(trip.updatedAt && { updatedAt: trip.updatedAt }),
    destination: trip.destination,
    userId,
    status: trip.status ?? "planejada",
  };
}

/* ───────────── repositório ───────────── */

export const postgresTrips: TripsRepository = {
  async list(userId, status) {
    const rows = await getPostgres()
      .db.select(tripSelection)
      .from(trips)
      .where(
        status
          ? and(eq(trips.userId, userId), eq(trips.status, status))
          : eq(trips.userId, userId),
      )
      .orderBy(
        // Sem filtro: planejadas primeiro.
        asc(sql`case when ${trips.status} = 'planejada' then 0 else 1 end`),
        // Planejadas: ida mais próxima primeiro, sem data no fim.
        sql`case when ${trips.status} = 'planejada' then ${trips.startDate} end asc nulls last`,
        // Realizadas: mais recentes primeiro.
        sql`${trips.completedAt} desc nulls last`,
        desc(trips.createdAt),
      );
    return rows.map(toRecord);
  },

  async find(userId, id) {
    const [row] = await getPostgres()
      .db.select(tripSelection)
      .from(trips)
      .where(and(eq(trips.id, id), eq(trips.userId, userId)))
      .limit(1);
    return row ? toRecord(row) : null;
  },

  async create(userId, trip) {
    const [row] = await getPostgres()
      .db.insert(trips)
      .values(tripInsertValues(userId, trip))
      .returning(tripSelection);
    return toRecord(row);
  },

  async update(userId, id, patch: TripPatch) {
    const { cover, ...fields } = patch;
    const [row] = await getPostgres()
      .db.update(trips)
      .set({
        ...fieldsToValues(fields),
        ...(cover !== undefined && coverToValues(cover)),
        updatedAt: new Date(),
      })
      .where(and(eq(trips.id, id), eq(trips.userId, userId)))
      .returning(tripSelection);
    return row ? toRecord(row) : null;
  },

  async remove(userId, id) {
    const deleted = await getPostgres()
      .db.delete(trips)
      .where(and(eq(trips.id, id), eq(trips.userId, userId)))
      .returning({ id: trips.id });
    return deleted.length > 0;
  },

  async complete(userId, items) {
    const ids = items.map((item) => item.id);

    return getPostgres().db.transaction(async (tx) => {
      const owned = await tx
        .select({ id: trips.id })
        .from(trips)
        .where(and(inArray(trips.id, ids), eq(trips.userId, userId)));
      if (owned.length !== ids.length) return null;

      const updated = new Map<string, TripRecord>();
      for (const { id, report } of items) {
        const [row] = await tx
          .update(trips)
          .set({
            ...fieldsToValues(report),
            status: "realizada",
            // Se já estava realizada, preserva a data original de conclusão.
            completedAt: sql`coalesce(${trips.completedAt}, now())`,
            updatedAt: new Date(),
          })
          .where(and(eq(trips.id, id), eq(trips.userId, userId)))
          .returning(tripSelection);
        updated.set(id, toRecord(row));
      }
      return ids.map((id) => updated.get(id) as TripRecord);
    });
  },

  async getCover(userId, id) {
    const [row] = await getPostgres()
      .db.select({ coverImage: trips.coverImage })
      .from(trips)
      .where(
        and(eq(trips.id, id), eq(trips.userId, userId), eq(trips.coverImageSource, "upload")),
      )
      .limit(1);
    return row?.coverImage ? decodeDataUrl(row.coverImage) : null;
  },

  async stats(userId) {
    const [row] = await getPostgres()
      .db.select({
        cities: sql<number>`count(distinct lower(coalesce(${trips.city}, ${trips.destination}))) filter (where ${trips.status} = 'realizada')`,
        countries: sql<number>`count(distinct ${trips.countryCode}) filter (where ${trips.status} = 'realizada')`,
        completedTrips: sql<number>`count(*) filter (where ${trips.status} = 'realizada')`,
        plannedTrips: sql<number>`count(*) filter (where ${trips.status} = 'planejada')`,
      })
      .from(trips)
      .where(eq(trips.userId, userId));

    // `count` volta como bigint (string) do driver.
    return {
      cities: Number(row?.cities ?? 0),
      countries: Number(row?.countries ?? 0),
      completedTrips: Number(row?.completedTrips ?? 0),
      plannedTrips: Number(row?.plannedTrips ?? 0),
    };
  },
};
