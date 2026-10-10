/**
 * Cache em memória (por instância) com TTL. Também junta chamadas simultâneas
 * à mesma chave numa só requisição. Resultados `null` (falha) são guardados por
 * pouco tempo para não martelar uma API que está fora do ar.
 */

export const TTL = {
  minute: 60_000,
  hour: 60 * 60_000,
  sixHours: 6 * 60 * 60_000,
  day: 24 * 60 * 60_000,
} as const;

/**
 * Validade (em segundos) no Data Cache persistente do Next, por tipo de dado.
 * Dados que quase não mudam (geocoding, fotos, clima histórico) ficam por dias:
 * ensaiar a demonstração uma vez deixa tudo "aquecido", mesmo entre instâncias e deploys.
 */
export const DATA_CACHE_SECONDS = {
  geocoding: 7 * 24 * 60 * 60,
  exchange: 60 * 60,
  forecast: 3 * 60 * 60,
  archive: 30 * 24 * 60 * 60,
  wikipedia: 7 * 24 * 60 * 60,
  commons: 30 * 24 * 60 * 60,
} as const;

const FAILURE_TTL_MS = 30_000;
const MAX_ENTRIES = 500;

interface Entry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

function remember(key: string, value: unknown, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES) {
    // Map mantém a ordem de inserção: o primeiro item é o mais antigo.
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.delete(key);
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T | null>,
): Promise<T | null> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.value as T | null);

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T | null>;

  const promise = load()
    .catch((error: unknown) => {
      console.warn(`[external] erro ao carregar "${key}":`, error);
      return null;
    })
    .then((value) => {
      remember(key, value, value === null ? FAILURE_TTL_MS : ttlMs);
      return value;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}
