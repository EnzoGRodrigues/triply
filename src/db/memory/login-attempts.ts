import type { LoginAttemptsRepository } from "../repositories";
import type { AttemptWindow } from "../types";
import { getStore, type LoginAttemptEntry } from "./store";

function windowOf(entries: LoginAttemptEntry[]): AttemptWindow {
  let oldest: Date | null = null;
  for (const { createdAt } of entries) {
    if (oldest === null || createdAt < oldest) oldest = createdAt;
  }
  return { count: entries.length, oldest: oldest ? new Date(oldest) : null };
}

export const memoryLoginAttempts: LoginAttemptsRepository = {
  async summarize(emailHash, ipHash, since) {
    const recent = getStore().loginAttempts.filter((entry) => entry.createdAt > since);
    return {
      pair: windowOf(recent.filter((e) => e.emailHash === emailHash && e.ipHash === ipHash)),
      ip: windowOf(recent.filter((e) => e.ipHash === ipHash)),
      email: windowOf(recent.filter((e) => e.emailHash === emailHash)),
    };
  },

  async record(emailHash, ipHash, pruneBefore) {
    const store = getStore();
    store.loginAttempts.push({ emailHash, ipHash, createdAt: new Date() });
    // Poda oportunista das entradas expiradas.
    store.loginAttempts = store.loginAttempts.filter((entry) => entry.createdAt >= pruneBefore);
  },

  async clear(emailHash, ipHash) {
    const store = getStore();
    store.loginAttempts = store.loginAttempts.filter(
      (entry) => !(entry.emailHash === emailHash && entry.ipHash === ipHash),
    );
  },
};
