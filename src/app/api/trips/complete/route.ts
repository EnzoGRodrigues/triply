import { requireUser } from "@/server/auth/session";
import { apiRoute } from "@/server/http/route";
import { json } from "@/server/http/response";
import { parseBody } from "@/server/http/validation";
import { completeTripsSchema } from "@/server/trips/schemas";
import { serializeTrip } from "@/server/trips/serialize";
import { completeTrips } from "@/server/trips/service";
import type { TripListResponse } from "@/types/api";

export const POST = apiRoute(async (request) => {
  const user = await requireUser();
  const input = await parseBody(request, completeTripsSchema);

  const rows = await completeTrips(user.id, input);
  return json<TripListResponse>({ trips: rows.map(serializeTrip) });
});
