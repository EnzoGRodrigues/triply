import type { JsonObject } from "../types";

export const docsPaths: Record<string, JsonObject> = {
  "/api/openapi.json": {
    get: {
      tags: ["Documentação"],
      operationId: "getOpenApiDocument",
      summary: "Especificação OpenAPI 3.1 desta API",
      description: "Este mesmo documento, em JSON. Público (não exige sessão). A interface interativa está em `/api-docs`.",
      security: [],
      responses: {
        "200": {
          description: "Documento OpenAPI 3.1.",
          content: { "application/json": { schema: { type: "object" } } },
        },
      },
    },
  },
};
