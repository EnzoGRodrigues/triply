/**
 * Confere a especificação OpenAPI contra o código real:
 *  1. toda rota em src/app/api/**\/route.ts (método + caminho) está documentada, e vice-versa;
 *  2. os exemplos de request/query passam nos schemas zod que a API de fato usa;
 *  3. cada exemplo de erro está no status HTTP que o seu `code` realmente devolve.
 *   npm run docs:check
 */
import "./load-env";

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import type { ZodType } from "zod";

import { destinationInsightsSchema, destinationSearchSchema } from "../src/server/destinations/schemas";
import { buildOpenApiSpec } from "../src/server/openapi";
import { completeTripsSchema, tripInputSchema, tripUpdateSchema } from "../src/server/trips/schemas";
import { loginSchema, registerSchema } from "../src/server/users/schemas";

type Json = { [key: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const METHODS = ["get", "post", "put", "patch", "delete"];
const API_DIR = join(process.cwd(), "src/app/api");

const problems: string[] = [];
const fail = (message: string) => problems.push(message);

const EXPECTED_STATUS: Record<string, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  EMAIL_IN_USE: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  EXTERNAL_API_ERROR: 502,
};

/* 1. rotas × spec */

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === "route.ts" ? [full] : [];
  });
}

const implemented = new Set<string>();
for (const file of routeFiles(API_DIR)) {
  const path =
    "/api/" +
    relative(API_DIR, file)
      .replace(/route\.ts$/, "")
      .split(sep)
      .filter(Boolean)
      .map((segment) => segment.replace(/^\[(.+)\]$/, "{$1}"))
      .join("/");
  const source = readFileSync(file, "utf8");
  for (const [, method] of source.matchAll(/export (?:const|async function|function) (GET|POST|PUT|PATCH|DELETE)\b/g)) {
    implemented.add(`${method} ${path.replace(/\/$/, "")}`);
  }
}

const spec = buildOpenApiSpec() as Json;
const documented = new Set<string>();
for (const [path, item] of Object.entries<Json>(spec.paths)) {
  for (const method of METHODS) if (item[method]) documented.add(`${method.toUpperCase()} ${path}`);
}

for (const op of implemented) if (!documented.has(op)) fail(`Rota sem documentação: ${op}`);
for (const op of documented) if (!implemented.has(op)) fail(`Documentada mas sem rota: ${op}`);

/* 2. exemplos × zod */

const requestSchemas: Record<string, ZodType> = {
  registerUser: registerSchema,
  loginUser: loginSchema,
  createTrip: tripInputSchema,
  updateTrip: tripUpdateSchema,
  completeTrips: completeTripsSchema,
};
const querySchemas: Record<string, ZodType> = {
  searchDestinations: destinationSearchSchema,
  getDestinationInsights: destinationInsightsSchema,
};

function mediaExamples(media: Json): Array<[string, unknown]> {
  if (media.example !== undefined) return [["example", media.example]];
  return Object.entries<Json>(media.examples ?? {}).map(([name, ex]) => [name, ex.value]);
}

for (const [path, item] of Object.entries<Json>(spec.paths)) {
  for (const method of METHODS) {
    const op: Json | undefined = item[method];
    if (!op) continue;
    const label = `${method.toUpperCase()} ${path}`;

    const bodySchema = requestSchemas[op.operationId];
    if (bodySchema) {
      for (const [name, value] of mediaExamples(op.requestBody.content["application/json"])) {
        const result = bodySchema.safeParse(value);
        if (!result.success) fail(`${label}: exemplo "${name}" é rejeitado pelo zod — ${result.error.issues[0]?.message}`);
      }
    }

    const querySchema = querySchemas[op.operationId];
    if (querySchema) {
      const query = Object.fromEntries(
        (op.parameters as Json[]).filter((p) => p.in === "query" && p.example !== undefined).map((p) => [p.name === "q" ? "q" : p.name, String(p.example)]),
      );
      const result = querySchema.safeParse(query);
      if (!result.success) fail(`${label}: parâmetros de exemplo rejeitados pelo zod — ${result.error.issues[0]?.message}`);
    }

    /* 3. código de erro × status */
    for (const [status, response] of Object.entries<Json>(op.responses)) {
      const resolved: Json = response.$ref ? spec.components.responses[response.$ref.split("/").pop()!] : response;
      for (const media of Object.values<Json>(resolved.content ?? {})) {
        for (const [name, value] of mediaExamples(media)) {
          const code = (value as Json)?.error?.code as string | undefined;
          if (!code) continue;
          const expected = EXPECTED_STATUS[code];
          if (expected !== Number(status)) fail(`${label}: exemplo "${name}" tem code ${code} mas está em ${status} (esperado ${expected})`);
        }
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`✗ ${problems.length} problema(s) na especificação OpenAPI:\n` + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`✓ OpenAPI ok: ${documented.size} operações documentadas, todas com rota; exemplos aceitos pelos schemas zod.`);
