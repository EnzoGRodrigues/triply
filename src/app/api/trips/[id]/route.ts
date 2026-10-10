import { requireUser } from "@/server/auth/session";
import { apiRoute } from "@/server/http/route";
import { json, noContent } from "@/server/http/response";
import { parseBody } from "@/server/http/validation";
import { tripUpdateSchema } from "@/server/trips/schemas";
import { serializeTrip } from "@/server/trips/serialize";
import { deleteTrip, getTrip, updateTrip } from "@/server/trips/service";
import type { TripResponse } from "@/types/api";

type Context = RouteContext<"/api/trips/[id]">;

export const GET = apiRoute<Context>(async (_request, { params }) => {
  const user = await requireUser();
  const { id } = await params;

  const row = await getTrip(user.id, id);
  return json<TripResponse>({ trip: serializeTrip(row) });
});

export const PATCH = apiRoute<Context>(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await parseBody(request, tripUpdateSchema);

  const row = await updateTrip(user.id, id, input);
  return json<TripResponse>({ trip: serializeTrip(row) });
});

export const DELETE = apiRoute<Context>(async (_request, { params }) => {
  const user = await requireUser();
  const { id } = await params;

  await deleteTrip(user.id, id);
  return noContent();
});
