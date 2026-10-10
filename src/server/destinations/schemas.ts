import { isRealCalendarDate } from "@/server/http/dates";
import { z } from "@/server/http/zod";

/** Parâmetro de query ausente ou vazio vira `undefined`. */
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

function coordinate(label: string, limit: number) {
  return z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: `${label} deve ser um número.` })
      .min(-limit, `${label} deve estar entre -${limit} e ${limit}.`)
      .max(limit, `${label} deve estar entre -${limit} e ${limit}.`)
      .optional(),
  );
}

function queryDate(label: string) {
  return z.preprocess(
    blankToUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} deve estar no formato AAAA-MM-DD.`)
      .refine(isRealCalendarDate, `${label} não é uma data válida.`)
      .optional(),
  );
}

/** GET /api/destinations/search?q= */
export const destinationSearchSchema = z.object({
  q: z
    .string({ error: "Informe o texto da busca (q)." })
    .trim()
    .min(2, "Digite ao menos 2 caracteres.")
    .max(100, "A busca deve ter no máximo 100 caracteres."),
});

/** GET /api/destinations/insights?name=&countryCode=&lat=&lon=&start=&end= */
export const destinationInsightsSchema = z
  .object({
    name: z.preprocess(
      blankToUndefined,
      z.string().trim().max(160, "O nome deve ter no máximo 160 caracteres.").optional(),
    ),
    countryCode: z.preprocess(
      (value) => {
        const cleaned = blankToUndefined(value);
        return typeof cleaned === "string" ? cleaned.trim().toUpperCase() : cleaned;
      },
      z
        .string()
        .regex(/^[A-Z]{2}$/, "O código do país deve ter 2 letras (ex.: BR).")
        .optional(),
    ),
    lat: coordinate("A latitude", 90),
    lon: coordinate("A longitude", 180),
    start: queryDate("A data de ida"),
    end: queryDate("A data de volta"),
  })
  .superRefine((value, ctx) => {
    if (!value.name && !value.countryCode && (value.lat === undefined || value.lon === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "Informe o destino (name), o país (countryCode) ou as coordenadas (lat e lon).",
      });
    }
    if ((value.lat === undefined) !== (value.lon === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: [value.lat === undefined ? "lat" : "lon"],
        message: "Informe latitude e longitude juntas.",
      });
    }
    if (value.start && value.end && value.end < value.start) {
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: "A volta deve ser no mesmo dia ou depois da ida.",
      });
    }
  });
