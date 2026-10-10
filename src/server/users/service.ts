import { repos } from "@/db";
import { assertLoginAllowed, clearFailedLogins, recordFailedLogin } from "@/server/auth/login-limit";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { ApiException, apiErrors } from "@/server/http/errors";
import type { ProfileStats } from "@/types/api";

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

/** Cria a conta. O e-mail já chega normalizado (trim + minúsculas) pelo schema. */
export async function registerUser({ name, email, password }: RegisterData) {
  const passwordHash = await hashPassword(password);

  // O repositório garante e-mail único sem a corrida entre "checar" e "inserir".
  const user = await repos.users.create({ name, email, passwordHash });
  if (!user) throw apiErrors.emailInUse();

  return user;
}

/**
 * Login com limite de tentativas: bloqueia (429) quem erra demais e registra as falhas.
 * Lança `INVALID_CREDENTIALS` sem distinguir se o e-mail ou a senha estava errado.
 */
export async function loginUser(email: string, password: string, ip: string) {
  await assertLoginAllowed(email, ip);
  try {
    const user = await authenticateUser(email, password);
    await clearFailedLogins(email, ip);
    return user;
  } catch (error) {
    if (error instanceof ApiException && error.code === "INVALID_CREDENTIALS") {
      await recordFailedLogin(email, ip);
    }
    throw error;
  }
}

async function authenticateUser(email: string, password: string) {
  const user = await repos.users.findByEmail(email);

  const valid = await verifyPassword(password, user?.passwordHash);
  if (!user || !valid) throw apiErrors.invalidCredentials();

  return user;
}

/**
 * Estatísticas do perfil (SPEC §4): cidades = distintos
 * `lower(coalesce(city, destination))` e países = distintos `country_code`
 * entre as viagens realizadas.
 */
export function getProfileStats(userId: string): Promise<ProfileStats> {
  return repos.trips.stats(userId);
}
