import { ref, type JsonObject } from "./types";

/** Exemplo de corpo `ApiError`. */
export function errorExample(code: string, message: string, fields?: Record<string, string>): JsonObject {
  return { error: { code, message, ...(fields ? { fields } : {}) } };
}

interface ErrorExampleSpec {
  summary: string;
  code: string;
  message: string;
  fields?: Record<string, string>;
}

/** Resposta de erro com schema `ApiError` e um ou mais exemplos nomeados. */
export function errorResponse(
  description: string,
  examples: Record<string, ErrorExampleSpec>,
): JsonObject {
  return {
    description,
    content: {
      "application/json": {
        schema: ref("ApiError"),
        examples: Object.fromEntries(
          Object.entries(examples).map(([name, { summary, code, message, fields }]) => [
            name,
            { summary, value: errorExample(code, message, fields) },
          ]),
        ),
      },
    },
  };
}

const VALIDATION_MESSAGE = "Dados inválidos. Revise os campos informados.";

/** Respostas reutilizáveis (`components.responses`). */
export const responses: Record<string, JsonObject> = {
  Unauthorized: errorResponse("Sem sessão, sessão inválida/expirada ou usuário inexistente. Nos dois últimos casos a resposta também traz `Set-Cookie: triply_session=; Max-Age=0` (expira o cookie).", {
    semSessao: {
      summary: "Cookie ausente ou inválido",
      code: "UNAUTHORIZED",
      message: "Faça login para continuar.",
    },
  }),
  ValidationError: errorResponse("Body ou query inválido. `error.fields` aponta o motivo de cada campo.", {
    campos: {
      summary: "Erro por campo",
      code: "VALIDATION_ERROR",
      message: VALIDATION_MESSAGE,
      fields: { email: "Informe um e-mail válido." },
    },
    jsonInvalido: {
      summary: "JSON malformado",
      code: "VALIDATION_ERROR",
      message: "O corpo da requisição não é um JSON válido.",
    },
    contentType: {
      summary: "Content-Type diferente de application/json",
      code: "VALIDATION_ERROR",
      message: 'Envie o corpo como JSON, com o cabeçalho "Content-Type: application/json".',
    },
  }),
  NotFound: errorResponse(
    "Recurso inexistente, id malformado **ou pertencente a outro usuário** (a API nunca revela que ele existe).",
    {
      viagem: { summary: "Viagem", code: "NOT_FOUND", message: "Viagem não encontrada." },
    },
  ),
  Forbidden: errorResponse(
    "Em métodos de escrita, o `Origin` enviado pelo navegador não é o host da aplicação (proteção contra CSRF). Requisições sem `Origin` (curl, servidor a servidor) não são afetadas.",
    {
      origem: {
        summary: "Origem não permitida",
        code: "FORBIDDEN",
        message: "Requisição de origem não permitida.",
      },
    },
  ),
  TooManyRequests: {
    ...errorResponse(
      "Muitas tentativas de login falhas (mais de 10 em 15 minutos para o mesmo e-mail+IP, ou 30 para o mesmo IP/e-mail). Aguarde o tempo indicado em `Retry-After`.",
      {
        bloqueado: {
          summary: "Login bloqueado temporariamente",
          code: "TOO_MANY_REQUESTS",
          message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
        },
      },
    ),
    headers: {
      "Retry-After": {
        description: "Segundos até o bloqueio terminar.",
        schema: { type: "integer" },
        example: 900,
      },
    },
  },
  ExternalApiError: errorResponse("Serviço externo essencial fora do ar (hoje, só a busca de destinos).", {
    geocoding: {
      summary: "Geocodificação indisponível",
      code: "EXTERNAL_API_ERROR",
      message: "A busca de destinos está indisponível no momento. Tente novamente em instantes.",
    },
  }),
  InternalError: errorResponse("Erro inesperado. Os detalhes ficam só no log do servidor.", {
    interno: {
      summary: "Erro interno",
      code: "INTERNAL_ERROR",
      message: "Erro interno do servidor. Tente novamente em instantes.",
    },
  }),
};

export const responseRef = (name: keyof typeof responses) => ref(name as string, "responses");
