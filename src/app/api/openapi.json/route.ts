import { buildOpenApiSpec } from "@/server/openapi";

// Spec estática (não depende de sessão nem de request): pública e cacheável.
const spec = buildOpenApiSpec();

export function GET() {
  return Response.json(spec, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
