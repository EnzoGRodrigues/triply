import type { ApiErrorCode } from "@/types/api";

interface ApiExceptionOptions {
  fields?: Record<string, string>;
  /** Responder também expirando o cookie de sessão (sessão inválida/de usuário que não existe mais). */
  clearSession?: boolean;
  /** Cabeçalhos extras da resposta (ex.: `Retry-After`). */
  headers?: Record<string, string>;
}

/** Erro de domínio da API: vira uma resposta `ApiError` com o status correto. */
export class ApiException extends Error {
  readonly fields?: Record<string, string>;
  readonly clearSession: boolean;
  readonly headers?: Record<string, string>;

  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    { fields, clearSession = false, headers }: ApiExceptionOptions = {},
  ) {
    super(message);
    this.name = "ApiException";
    this.fields = fields;
    this.clearSession = clearSession;
    this.headers = headers;
  }
}

export const apiErrors = {
  validation: (
    fields?: Record<string, string>,
    message = "Dados inválidos. Revise os campos informados.",
  ) => new ApiException(400, "VALIDATION_ERROR", message, { fields }),

  unauthorized: (message = "Faça login para continuar.", clearSession = false) =>
    new ApiException(401, "UNAUTHORIZED", message, { clearSession }),

  invalidCredentials: () =>
    new ApiException(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos."),

  forbidden: (message = "Você não tem permissão para fazer isso.") =>
    new ApiException(403, "FORBIDDEN", message),

  notFound: (message = "Recurso não encontrado.") =>
    new ApiException(404, "NOT_FOUND", message),

  emailInUse: () =>
    new ApiException(
      409,
      "EMAIL_IN_USE",
      "Este e-mail já está cadastrado. Tente entrar na sua conta.",
      { fields: { email: "Este e-mail já está cadastrado." } },
    ),

  tooManyRequests: (retryAfterSeconds: number, message: string) =>
    new ApiException(429, "TOO_MANY_REQUESTS", message, {
      headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterSeconds))) },
    }),

  external: (message = "Não foi possível consultar o serviço externo.") =>
    new ApiException(502, "EXTERNAL_API_ERROR", message),

  internal: (message = "Erro interno do servidor. Tente novamente em instantes.") =>
    new ApiException(500, "INTERNAL_ERROR", message),
};
