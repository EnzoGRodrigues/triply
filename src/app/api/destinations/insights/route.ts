import { requireUser } from "@/server/auth/session";
import { destinationInsightsSchema } from "@/server/destinations/schemas";
import { getDestinationInsights } from "@/server/destinations/insights";
import { json } from "@/server/http/response";
import { apiRoute } from "@/server/http/route";
import { parseWith } from "@/server/http/validation";
import type { DestinationInsightsResponse } from "@/types/api";

export const GET = apiRoute(async (request) => {
  await requireUser();
  const params = request.nextUrl.searchParams;
  const query = parseWith(destinationInsightsSchema, {
    name: params.get("name") ?? undefined,
    countryCode: params.get("countryCode") ?? undefined,
    lat: params.get("lat") ?? undefined,
    lon: params.get("lon") ?? undefined,
    start: params.get("start") ?? undefined,
    end: params.get("end") ?? undefined,
  });

  // Cada bloco falha sozinho (vira null): a rota responde 200 mesmo com APIs fora do ar.
  const insights = await getDestinationInsights({
    name: query.name,
    countryCode: query.countryCode,
    latitude: query.lat,
    longitude: query.lon,
    start: query.start,
    end: query.end,
  });
  return json<DestinationInsightsResponse>(insights);
});
