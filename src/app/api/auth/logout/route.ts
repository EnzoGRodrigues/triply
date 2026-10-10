import { clearSessionCookie } from "@/server/auth/cookie";
import { apiRoute } from "@/server/http/route";
import { noContent } from "@/server/http/response";

export const POST = apiRoute(async () => {
  const response = noContent();
  clearSessionCookie(response);
  return response;
});
