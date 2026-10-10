import { requireUser } from "@/server/auth/session";
import { destinationSearchSchema } from "@/server/destinations/schemas";
import { searchDestinations } from "@/server/external/geocoding";
import { apiErrors } from "@/server/http/errors";
import { json } from "@/server/http/response";
import { apiRoute } from "@/server/http/route";
import { parseWith } from "@/server/http/validation";
import type { DestinationSearchResponse } from "@/types/api";

export const GET = apiRoute(async (request) => {
  await requireUser();
  const { q } = parseWith(destinationSearchSchema, {
    q: request.nextUrl.searchParams.get("q") ?? undefined,
  });

  const results = await searchDestinations(q);
  if (results === null) {
    throw apiErrors.external("A busca de destinos está indisponível no momento. Tente novamente em instantes.");
  }
  return json<DestinationSearchResponse>({ results });
});
