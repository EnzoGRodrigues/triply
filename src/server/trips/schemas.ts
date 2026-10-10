import { isRealCalendarDate } from "@/server/http/dates";
import { z } from "@/server/http/zod";

import {
  decodeImageDataUrl,
  isDataUrl,
  isHttpsUrl,
  MAX_COVER_BYTES,
} from "./cover";

/* ───────────── blocos reutilizáveis ───────────── */

/** Texto vazio/só espaços vira `null`. */
const blankToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

/** Texto opcional e anulável, com `trim` e limite de tamanho. */
function nullableText(label: string, max: number) {
  return z
    .preprocess(
      blankToNull,
      z
        .string({ error: `${label} deve ser um texto.` })
        .trim()
        .max(max, `${label} deve ter no máximo ${max} caracteres.`)
        .nullable(),
    )
    .optional();
}

function nullableNumber(label: string, min: number, max: number, message?: string) {
  return z
    .number({ error: `${label} deve ser um número.` })
    .min(min, message ?? `${label} deve ser maior ou igual a ${min}.`)
    .max(max, message ?? `${label} deve ser menor ou igual a ${max}.`)
    .nullable()
    .optional();
}

function nullableDate(label: string) {
  return z
    .preprocess(
      blankToNull,
      z
        .string({ error: `${label} deve ser uma data (AAAA-MM-DD).` })
        .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} deve estar no formato AAAA-MM-DD.`)
        .refine(isRealCalendarDate, `${label} não é uma data válida.`)
        .nullable(),
    )
    .optional();
}

const coverImage = z
  .string({ error: "A imagem de capa deve ser um texto." })
  .refine(
    (value) => {
      if (isDataUrl(value)) return decodeImageDataUrl(value) !== null;
      return isHttpsUrl(value);
    },
    `A capa deve ser uma imagem PNG, JPEG, WebP ou GIF de até ${MAX_COVER_BYTES / 1024 / 1024} MB (data URL) ou uma URL https válida.`,
  )
  .nullable()
  .optional();

const upper = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

/* ───────────── campos da viagem (TripInput) ───────────── */

const tripFields = {
  city: nullableText("A cidade", 120),
  region: nullableText("A região", 120),
  country: nullableText("O país", 120),
  countryCode: z
    .preprocess(
      (value) => blankToNull(upper(value)),
      z
        .string({ error: "O código do país deve ser um texto." })
        .regex(/^[A-Z]{2}$/, "O código do país deve ter 2 letras (ex.: BR).")
        .nullable(),
    )
    .optional(),
  latitude: nullableNumber("A latitude", -90, 90),
  longitude: nullableNumber("A longitude", -180, 180),
  startDate: nullableDate("A data de ida"),
  endDate: nullableDate("A data de volta"),
  accommodation: nullableText("A hospedagem", 200),
  activities: nullableText("As atividades", 2000),
  transport: z
    .enum(["aviao", "carro", "onibus"], {
      error: "Transporte inválido. Use aviao, carro ou onibus.",
    })
    .optional(),
  currencyCode: z
    .preprocess(
      (value) => blankToNull(upper(value)),
      z
        .string({ error: "O código da moeda deve ser um texto." })
        .regex(/^[A-Z]{3}$/, "O código da moeda deve ter 3 letras (ex.: BRL).")
        .nullable(),
    )
    .optional(),
  exchangeRate: z
    .number({ error: "A cotação deve ser um número." })
    .positive("A cotação deve ser maior que zero.")
    .max(99_999_999, "A cotação é alta demais.")
    .nullable()
    .optional(),
  tempMin: nullableNumber("A temperatura mínima", -90, 60),
  tempMax: nullableNumber("A temperatura máxima", -90, 60),
  coverImage,
  coverImageSource: z
    .enum(["upload", "wikipedia", "externa"], {
      error: "Origem da capa inválida.",
    })
    .nullable()
    .optional(),
};

const destination = z
  .string({ error: "Informe o destino." })
  .trim()
  .min(1, "Informe o destino.")
  .max(160, "O destino deve ter no máximo 160 caracteres.");

/* ───────────── relato (TripReportInput) ───────────── */

const reportFields = {
  rating: z
    .number({ error: "A avaliação deve ser um número." })
    .int("A avaliação deve ser um número inteiro de 1 a 5.")
    .min(1, "A avaliação deve ser de 1 a 5 estrelas.")
    .max(5, "A avaliação deve ser de 1 a 5 estrelas.")
    .nullable()
    .optional(),
  companions: z
    .enum(["sozinho", "casal", "familia", "amigos", "trabalho"], {
      error: "Companhia inválida.",
    })
    .nullable()
    .optional(),
  expenses: z
    .number({ error: "Os gastos devem ser um número." })
    .min(0, "Os gastos não podem ser negativos.")
    .max(9_999_999_999.99, "O valor dos gastos é alto demais.")
    .nullable()
    .optional(),
  experience: nullableText("O relato", 5000),
};

/* ───────────── regras entre campos ───────────── */

interface RangeFields {
  startDate?: string | null;
  endDate?: string | null;
  tempMin?: number | null;
  tempMax?: number | null;
}

/** Mesmas regras usadas no PATCH depois de mesclar com os dados já salvos. */
export function rangeIssues(value: RangeFields): Record<string, string> {
  const issues: Record<string, string> = {};
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    issues.endDate = "A volta deve ser no mesmo dia ou depois da ida.";
  }
  if (
    value.tempMin != null &&
    value.tempMax != null &&
    value.tempMax < value.tempMin
  ) {
    issues.tempMax = "A temperatura máxima deve ser maior ou igual à mínima.";
  }
  return issues;
}

function refineRanges(value: RangeFields, ctx: z.RefinementCtx) {
  for (const [path, message] of Object.entries(rangeIssues(value))) {
    ctx.addIssue({ code: "custom", path: [path], message });
  }
}

/* ───────────── schemas de entrada ───────────── */

/** POST /api/trips */
export const tripInputSchema = z
  .object({ destination, ...tripFields })
  .superRefine(refineRanges);

/** PATCH /api/trips/{id} — qualquer subconjunto, incluindo o relato. */
export const tripUpdateSchema = z
  .object({
    destination: destination.optional(),
    ...tripFields,
    ...reportFields,
  })
  .superRefine(refineRanges);

const tripReportItem = z.object({
  id: z.uuid("Identificador de viagem inválido."),
  ...reportFields,
});

/** POST /api/trips/complete */
export const completeTripsSchema = z.object({
  trips: z
    .array(tripReportItem, { error: "Informe a lista de viagens." })
    .min(1, "Selecione ao menos uma viagem.")
    .max(50, "Selecione no máximo 50 viagens por vez.")
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
      "Há viagens repetidas na lista.",
    ),
});

/** GET /api/trips?status= */
export const tripListQuerySchema = z.object({
  status: z
    .enum(["planejada", "realizada"], {
      error: "Status inválido. Use planejada ou realizada.",
    })
    .optional(),
});

export type TripInputData = z.infer<typeof tripInputSchema>;
export type TripUpdateData = z.infer<typeof tripUpdateSchema>;
export type CompleteTripsData = z.infer<typeof completeTripsSchema>;
export type TripReportData = z.infer<typeof tripReportItem>;
