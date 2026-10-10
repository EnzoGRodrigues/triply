import { buildDemoData } from "../demo";
import type { UserRecord } from "../types";
import { createStoredTrip, type StoredTrip } from "./trip-model";

export interface LoginAttemptEntry {
  emailHash: string;
  ipHash: string;
  createdAt: Date;
}

export interface MemoryStore {
  users: Map<string, UserRecord>;
  /** e-mail (normalizado) → id: garante e-mail único. */
  userIdsByEmail: Map<string, string>;
  trips: Map<string, StoredTrip>;
  loginAttempts: LoginAttemptEntry[];
}

/**
 * O store vive em `globalThis`: no `next dev` cada rota pode ter a sua cópia do módulo e o
 * HMR recarrega módulos — sem isso cada rota veria um banco diferente. Na Vercel vale por
 * instância de função (some em reinício, deploy ou outra instância).
 */
const globalForStore = globalThis as typeof globalThis & {
  __triplyMemoryStore?: MemoryStore;
};

function createSeededStore(): MemoryStore {
  const store: MemoryStore = {
    users: new Map(),
    userIdsByEmail: new Map(),
    trips: new Map(),
    loginAttempts: [],
  };

  for (const { user, trips } of buildDemoData()) {
    const record: UserRecord = {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt ?? new Date(),
    };
    store.users.set(record.id, record);
    store.userIdsByEmail.set(record.email, record.id);
    for (const trip of trips) {
      const stored = createStoredTrip(record.id, trip);
      store.trips.set(stored.record.id, stored);
    }
  }
  return store;
}

/** Inicialização preguiçosa e idempotente: o primeiro acesso popula os dados de demonstração. */
export function getStore(): MemoryStore {
  globalForStore.__triplyMemoryStore ??= createSeededStore();
  return globalForStore.__triplyMemoryStore;
}
