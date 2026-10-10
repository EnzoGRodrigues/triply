import { apiRoute } from "@/server/http/route";
import { created } from "@/server/http/response";
import { parseBody } from "@/server/http/validation";
import { setSessionCookie } from "@/server/auth/cookie";
import { signSessionToken } from "@/server/auth/token";
import { registerSchema } from "@/server/users/schemas";
import { serializeUser } from "@/server/users/serialize";
import { registerUser } from "@/server/users/service";
import type { AuthResponse } from "@/types/api";

export const POST = apiRoute(async (request) => {
  const input = await parseBody(request, registerSchema);
  const row = await registerUser(input);

  const response = created<AuthResponse>({ user: serializeUser(row) });
  setSessionCookie(response, await signSessionToken(row.id));
  return response;
});
