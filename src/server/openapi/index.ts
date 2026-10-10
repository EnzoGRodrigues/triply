import { apiDescription } from "./description";
import { authPaths } from "./paths/auth";
import { destinationPaths } from "./paths/destinations";
import { docsPaths } from "./paths/docs";
import { profilePaths } from "./paths/profile";
import { tripPaths } from "./paths/trips";
import { responses } from "./responses";
import { schemas } from "./schemas";
import { ref, type JsonObject } from "./types";

const WRITE_METHODS = ["post", "put", "patch", "delete"];

/**
 * Todo método de escrita pode responder 403 (checagem de `Origin`): em vez de repetir
 * a resposta em cada operação, ela é acrescentada aqui e as respostas ficam em ordem de status.
 */
function withWriteGuards(paths: Record<string, JsonObject>): Record<string, JsonObject> {
  return Object.fromEntries(
    Object.entries(paths).map(([path, item]) => [
      path,
      Object.fromEntries(
        Object.entries(item).map(([method, operation]) => {
          if (!WRITE_METHODS.includes(method)) return [method, operation];
          const op = operation as JsonObject & { responses: Record<string, unknown> };
          const merged = { "403": ref("Forbidden", "responses"), ...op.responses };
          const sorted = Object.fromEntries(
            Object.entries(merged).sort(([a], [b]) => Number(a) - Number(b)),
          );
          return [method, { ...op, responses: sorted }];
        }),
      ),
    ]),
  );
}

/** Documento OpenAPI 3.1 do Triply, servido em `GET /api/openapi.json`. */
export function buildOpenApiSpec(): JsonObject {
  return {
    openapi: "3.1.0",
    info: {
      title: "Triply API",
      version: "1.0.0",
      summary: "API REST do Triply: autenticação, viagens e destinos (com APIs externas).",
      description: apiDescription,
      contact: { name: "Triply — projeto DSW3" },
    },
    servers: [{ url: "/", description: "Mesma origem (o domínio em que esta documentação está aberta)" }],
    tags: [
      { name: "Autenticação", description: "Cadastro, login, logout e sessão (cookie `triply_session`)." },
      { name: "Perfil", description: "Dados do usuário logado e estatísticas de viagens." },
      { name: "Viagens", description: "CRUD de viagens planejadas/realizadas, conclusão em lote e capa por upload." },
      {
        name: "Destinos / APIs externas",
        description:
          "Rotas que expõem ao front as **APIs externas** consumidas pelo back (Open-Meteo, AwesomeAPI, ExchangeRate-API, Frankfurter, Wikipedia/Commons, flagcdn).",
      },
      { name: "Documentação", description: "Esta especificação." },
    ],
    security: [{ cookieAuth: [] }],
    paths: withWriteGuards({
      ...authPaths,
      ...profilePaths,
      ...tripPaths,
      ...destinationPaths,
      ...docsPaths,
    }),
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "triply_session",
          description:
            "Cookie de sessão (JWT HS256, 7 dias, `HttpOnly`) criado por `POST /api/auth/login` ou `POST /api/auth/register`. Não é preciso informá-lo manualmente: execute o login nesta página e o navegador o reenvia sozinho.",
        },
      },
      schemas,
      responses,
    },
  };
}
