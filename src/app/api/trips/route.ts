import { requireUser } from "@/server/auth/session";
import { apiRoute } from "@/server/http/route";
import { created, json } from "@/server/http/response";
import { parseBody, parseWith } from "@/server/http/validation";
import { tripInputSchema, tripListQuerySchema } from "@/server/trips/schemas";
import { serializeTrip } from "@/server/trips/serialize";
import { createTrip, listTrips } from "@/server/trips/service";
import type { TripListResponse, TripResponse } from "@/types/api";

export const GET = apiRoute(async (request) => {
  const user = await requireUser();
  const { status } = parseWith(tripListQuerySchema, {
    status: request.nextUrl.searchParams.get("status") || undefined,
  });

  const rows = await listTrips(user.id, status);
  return json<TripListResponse>({ trips: rows.map(serializeTrip) });
});

export const POST = apiRoute(async (request) => {
  const user = await requireUser();
  const input = await parseBody(request, tripInputSchema);

  const row = await createTrip(user.id, input);
  return created<TripResponse>({ trip: serializeTrip(row) });
});
