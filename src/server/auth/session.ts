import { cookies } from "next/headers";

import { repos } from "@/db";
import { apiErrors } from "@/server/http/errors";
import { serializeUser } from "@/server/users/serialize";
import type { User } from "@/types/api";

import { SESSION_COOKIE, verifySessionToken } from "./token";

/**
 * Exige sessão válida em um route handler e devolve o usuário logado.
 * Lança `UNAUTHORIZED` (401) se o cookie faltar, estiver inválido/expirado
 * ou se o usuário não existir mais — nos dois últimos casos a resposta também
 * expira o cookie de sessão (`Set-Cookie` com `Max-Age=0`).
 */
export async function requireUser(): Promise<User> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token);
  // Cookie presente mas inválido/expirado: expira junto com o 401, para não ficar reenviando.
  if (!userId) throw apiErrors.unauthorized(undefined, token !== undefined);

  const user = await repos.users.findById(userId);
  // JWT válido de um usuário que não existe mais (ex.: após re-seed): limpa o cookie
  // para o proxy não mandar /login → /perfil em loop.
  if (!user) throw apiErrors.unauthorized(undefined, true);

  return serializeUser(user);
}
