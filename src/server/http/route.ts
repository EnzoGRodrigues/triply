import { unstable_rethrow } from "next/navigation";
import type { NextRequest } from "next/server";
import { ZodError } from "zod";

import { ApiException, apiErrors } from "./errors";
import { errorResponse } from "./response";
import { validationFromZod } from "./validation";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Defesa extra contra CSRF (além do `SameSite=Lax` do cookie): em métodos de escrita,
 * se o navegador mandou `Origin`, ele precisa ser o próprio host da aplicação.
 * Sem `Origin` (curl, chamadas servidor-a-servidor) a requisição segue normalmente.
 */
function assertSameOrigin(request: NextRequest): void {
  if (!WRITE_METHODS.has(request.method)) return;
  const origin = request.headers.get("origin");
  if (origin === null) return;

  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host"))
    ?.split(",")[0]
    .trim();
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host; // "null" (origem opaca) cai no catch
  } catch {
    originHost = null;
  }
  if (!host || originHost !== host) {
    throw apiErrors.forbidden("Requisição de origem não permitida.");
  }
}

type Handler<Ctx> = (request: NextRequest, context: Ctx) => Promise<Response>;

/** Código SQLSTATE do Postgres, mesmo quando o drizzle embrulha o erro em `cause`. */
function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export function toApiException(error: unknown): ApiException {
  if (error instanceof ApiException) return error;
  if (error instanceof ZodError) return validationFromZod(error);

  switch (pgErrorCode(error)) {
    case "23505": // unique_violation
      return apiErrors.emailInUse();
    case "23514": // check_violation
    case "22007": // invalid_datetime_format
    case "22008": // datetime_field_overflow
    case "22003": // numeric_value_out_of_range
      return apiErrors.validation(undefined, "Alguns valores informados são inválidos.");
    case "22P02": // invalid_text_representation (ex.: UUID malformado)
      return apiErrors.notFound();
  }

  console.error("[api] erro inesperado:", error);
  return apiErrors.internal();
}

/**
 * Envolve um route handler: qualquer exceção vira uma resposta `ApiError`
 * (nunca vaza stack trace nem detalhes do banco).
 */
export function apiRoute<Ctx = unknown>(handler: Handler<Ctx>): Handler<Ctx> {
  return async (request, context) => {
    try {
      assertSameOrigin(request);
      return await handler(request, context);
    } catch (error) {
      // Erros internos do Next (ex.: `cookies()` rejeitando ao fim do prerender) não são nossos:
      // devem seguir adiante, não virar um "500" logado.
      unstable_rethrow(error);
      return errorResponse(toApiException(error));
    }
  };
}
