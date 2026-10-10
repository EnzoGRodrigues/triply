import { createHmac } from "node:crypto";

import { repos } from "@/db";
import { apiErrors } from "@/server/http/errors";

import { getJwtSecret } from "./token";

/**
 * Limite de tentativas de login. As falhas ficam no repositório de tentativas: no Postgres
 * (tabela `login_attempts`) elas valem para todas as instâncias — o que funciona em serverless;
 * no banco em memória valem só para a instância e somem ao reiniciar.
 * Bloqueia (429) quando, nos últimos 15 minutos, há falhas demais:
 *  - para o mesmo e-mail vindo do mesmo IP (força bruta numa conta),
 *  - para o mesmo IP, em qualquer e-mail (varredura de contas),
 *  - para o mesmo e-mail, de qualquer IP (ataque distribuído).
 * E-mail e IP são guardados só como HMAC.
 */

const WINDOW_MS = 15 * 60 * 1000;
const RETENTION_MS = 24 * 60 * 60 * 1000;
const LIMITS = { pair: 10, ip: 30, email: 30 } as const;

function fingerprint(value: string): string {
  return createHmac("sha256", getJwtSecret()).update(value).digest("hex").slice(0, 32);
}

/** IP do cliente. Na Vercel `x-forwarded-for` é definido pela plataforma (não é forjável). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-vercel-forwarded-for") ?? headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
}

/** Lança `TOO_MANY_REQUESTS` (429, com `Retry-After`) se o limite já foi atingido. */
export async function assertLoginAllowed(email: string, ip: string): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MS);
  const summary = await repos.loginAttempts.summarize(fingerprint(email), fingerprint(ip), since);

  // Tentativas bloqueadas não são gravadas: a contagem para no limite e a mais
  // antiga a expirar é exatamente quando o bloqueio termina.
  const blocking = (
    [
      [summary.pair, LIMITS.pair],
      [summary.ip, LIMITS.ip],
      [summary.email, LIMITS.email],
    ] as const
  ).filter(([window, limit]) => window.count >= limit);
  if (blocking.length === 0) return;

  const releaseAt = Math.max(
    ...blocking.map(([window]) => (window.oldest ? window.oldest.getTime() : Date.now()) + WINDOW_MS),
  );
  const retryAfter = Math.max(1, Math.ceil((releaseAt - Date.now()) / 1000));
  const minutes = Math.ceil(retryAfter / 60);
  throw apiErrors.tooManyRequests(
    retryAfter,
    `Muitas tentativas de login. Tente novamente em ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`,
  );
}

/** Registra uma falha e aproveita para apagar tentativas antigas. */
export async function recordFailedLogin(email: string, ip: string): Promise<void> {
  await repos.loginAttempts.record(
    fingerprint(email),
    fingerprint(ip),
    new Date(Date.now() - RETENTION_MS),
  );
}

/** Login bem-sucedido: zera as falhas desse e-mail neste IP. */
export async function clearFailedLogins(email: string, ip: string): Promise<void> {
  await repos.loginAttempts.clear(fingerprint(email), fingerprint(ip));
}
