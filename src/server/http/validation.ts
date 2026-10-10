import type { ZodError, ZodType, output } from "zod";

import { apiErrors } from "./errors";

/** Tamanho máximo do corpo JSON: cobre a capa de ~2 MB em base64 (+33%). */
export const MAX_BODY_BYTES = 4 * 1024 * 1024;

/** Converte os issues do zod em `{ campo: mensagem }` (primeira mensagem de cada campo). */
export function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

export function validationFromZod(error: ZodError) {
  return apiErrors.validation(zodFields(error));
}

/** Valida `data` com o schema ou lança `VALIDATION_ERROR` (400) com `fields`. */
export function parseWith<S extends ZodType>(schema: S, data: unknown): output<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw validationFromZod(result.error);
  return result.data;
}

/** Lê o corpo da requisição como JSON, com limite de tamanho e erros em pt-BR. */
export async function readJson(request: Request): Promise<unknown> {
  // Exigir JSON de verdade (e não `text/plain` ou formulário) fecha a porta de CSRF "simples".
  if (!/^application\/json\s*(;|$)/i.test(request.headers.get("content-type") ?? "")) {
    throw apiErrors.validation(
      undefined,
      'Envie o corpo como JSON, com o cabeçalho "Content-Type: application/json".',
    );
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    throw apiErrors.validation(undefined, "O corpo da requisição é grande demais.");
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    throw apiErrors.validation(undefined, "Não foi possível ler o corpo da requisição.");
  }
  if (text.length > MAX_BODY_BYTES) {
    throw apiErrors.validation(undefined, "O corpo da requisição é grande demais.");
  }
  if (text.trim() === "") {
    throw apiErrors.validation(undefined, "Envie um corpo JSON na requisição.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw apiErrors.validation(undefined, "O corpo da requisição não é um JSON válido.");
  }
}

/** `readJson` + `parseWith`. */
export async function parseBody<S extends ZodType>(
  request: Request,
  schema: S,
): Promise<output<S>> {
  return parseWith(schema, await readJson(request));
}
