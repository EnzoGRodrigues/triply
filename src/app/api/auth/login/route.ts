import { setSessionCookie } from "@/server/auth/cookie";
import { clientIp } from "@/server/auth/login-limit";
import { signSessionToken } from "@/server/auth/token";
import { apiRoute } from "@/server/http/route";
import { json } from "@/server/http/response";
import { parseBody } from "@/server/http/validation";
import { loginSchema } from "@/server/users/schemas";
import { serializeUser } from "@/server/users/serialize";
import { loginUser } from "@/server/users/service";
import type { AuthResponse } from "@/types/api";

export const POST = apiRoute(async (request) => {
  const { email, password } = await parseBody(request, loginSchema);
  const row = await loginUser(email, password, clientIp(request.headers));

  const response = json<AuthResponse>({ user: serializeUser(row) });
  setSessionCookie(response, await signSessionToken(row.id));
  return response;
});
