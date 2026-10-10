/**
 * Cliente HTTP comum das APIs externas: timeout, User-Agent do projeto e erro → `null`.
 * Nada aqui lança: uma API fora do ar nunca pode derrubar uma rota do Triply.
 */

export const USER_AGENT = "Triply/1.0 (projeto academico DSW3)";
export const DEFAULT_TIMEOUT_MS = 5_000;

interface FetchOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  /**
   * Segundos em que a resposta fica no Data Cache do Next (`fetch` com `next.revalidate`):
   * persistente e compartilhado entre instâncias/deploys. Só respostas 2xx entram no
   * cache — falhas (429, 5xx, timeout) nunca são guardadas. Sem isso, não há cache aqui.
   */
  revalidate?: number;
}

/** Hosts que pediram pausa (HTTP 429 + `Retry-After`): não insistimos até o fim dela. */
const cooldownUntil = new Map<string, number>();
const DEFAULT_COOLDOWN_MS = 30_000;
const MAX_COOLDOWN_MS = 60_000;

function startCooldown(host: string, retryAfter: string | null): void {
  const seconds = Number(retryAfter);
  const ms = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : DEFAULT_COOLDOWN_MS;
  cooldownUntil.set(host, Date.now() + Math.min(ms, MAX_COOLDOWN_MS));
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    return error.name === "TimeoutError" ? "timeout" : error.message;
  }
  return String(error);
}

export async function fetchJson<T>(
  url: string,
  { timeoutMs = DEFAULT_TIMEOUT_MS, headers, revalidate }: FetchOptions = {},
): Promise<T | null> {
  const { host, pathname } = new URL(url);
  if ((cooldownUntil.get(host) ?? 0) > Date.now()) return null;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers },
      signal: AbortSignal.timeout(timeoutMs),
      // Camada 1 é a memória (cache.ts); a camada 2, persistente, é o Data Cache do Next.
      ...(revalidate ? { next: { revalidate } } : { cache: "no-store" as const }),
    });
    if (!response.ok) {
      if (response.status === 429) startCooldown(host, response.headers.get("retry-after"));
      console.warn(`[external] HTTP ${response.status} em ${host}${pathname}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn(`[external] falha em ${host}: ${describe(error)}`);
    return null;
  }
}

/** Resolve para `null` se a promessa passar do prazo (ela continua em segundo plano e aquece o cache). */
export async function withDeadline<T>(
  promise: Promise<T | null>,
  ms: number,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([promise.catch(() => null), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
