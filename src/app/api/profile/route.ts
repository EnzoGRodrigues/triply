import { requireUser } from "@/server/auth/session";
import { apiRoute } from "@/server/http/route";
import { json } from "@/server/http/response";
import { getProfileStats } from "@/server/users/service";
import type { ProfileResponse } from "@/types/api";

export const GET = apiRoute(async () => {
  const user = await requireUser();
  const stats = await getProfileStats(user.id);
  return json<ProfileResponse>({ user, stats });
});
