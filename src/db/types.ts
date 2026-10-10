/**
 * Registros do banco em TypeScript puro — independentes de Drizzle, `pg` ou de
 * qualquer driver. Os repositórios (memória ou Postgres) devolvem estes tipos,
 * com números como `number` e datas de calendário como "YYYY-MM-DD".
 */

import type { Companions, CoverImageSource, Transport, TripStatus } from "@/types/api";

export interface UserRecord {
  id: string;
  name: string;
  /** Sempre normalizado (trim + minúsculas) antes de gravar/consultar. */
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface NewUser {
  /** Opcional: o seed usa ids fixos. */
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt?: Date;
}

/** Campos da viagem que o usuário preenche/edita. */
export interface TripFields {
  destination: string;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  /** "YYYY-MM-DD" */
  startDate: string | null;
  /** "YYYY-MM-DD" */
  endDate: string | null;
  accommodation: string | null;
  activities: string | null;
  transport: Transport;
  currencyCode: string | null;
  exchangeRate: number | null;
  exchangeRateAt: Date | null;
  tempMin: number | null;
  tempMax: number | null;
  rating: number | null;
  companions: Companions | null;
  expenses: number | null;
  experience: string | null;
}

/**
 * Viagem como as consultas a devolvem. A imagem enviada por upload NUNCA vem aqui
 * (pode ter ~2 MB): só `coverExternalUrl`, quando a capa é uma URL externa.
 */
export interface TripRecord extends TripFields {
  id: string;
  userId: string;
  status: TripStatus;
  coverImageSource: CoverImageSource | null;
  /** URL https da capa externa; `null` se a capa é upload ou não existe. */
  coverExternalUrl: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/** Imagem enviada pelo usuário, guardada como bytes. */
export interface CoverUpload {
  mime: ImageMime;
  bytes: Buffer;
}

/** Capa a gravar: upload (bytes), URL externa, ou `null` para remover. */
export type TripCover =
  | ({ kind: "upload" } & CoverUpload)
  | { kind: "external"; url: string; source: Exclude<CoverImageSource, "upload"> }
  | null;

export interface NewTrip extends Partial<Omit<TripFields, "destination">> {
  destination: string;
  /** Opcionais: o seed usa ids e datas fixos. */
  id?: string;
  status?: TripStatus;
  cover?: TripCover;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Atualização parcial: chave ausente (`undefined`) = mantém; `null` = limpa. */
export type TripPatch = Partial<TripFields> & {
  /** `undefined` = mantém a capa; `null` = remove. */
  cover?: TripCover;
};

export type TripReport = Partial<
  Pick<TripFields, "rating" | "companions" | "expenses" | "experience">
>;

export interface TripStats {
  cities: number;
  countries: number;
  completedTrips: number;
  plannedTrips: number;
}

/** Falhas de login numa janela de tempo, para o limite de tentativas. */
export interface AttemptWindow {
  count: number;
  /** A mais antiga da janela (quando ela expira, o bloqueio termina). */
  oldest: Date | null;
}

export interface LoginAttemptSummary {
  /** Mesmo e-mail a partir do mesmo IP. */
  pair: AttemptWindow;
  /** Mesmo IP, qualquer e-mail. */
  ip: AttemptWindow;
  /** Mesmo e-mail, qualquer IP. */
  email: AttemptWindow;
}
