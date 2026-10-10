import { requireUser } from "@/server/auth/session";
import { apiRoute } from "@/server/http/route";
import { json } from "@/server/http/response";
import type { AuthResponse } from "@/types/api";

export const GET = apiRoute(async () => {
  const user = await requireUser();
  return json<AuthResponse>({ user });
});
