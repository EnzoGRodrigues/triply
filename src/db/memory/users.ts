import { randomUUID } from "node:crypto";

import type { UsersRepository } from "../repositories";
import { getStore } from "./store";

export const memoryUsers: UsersRepository = {
  async findById(id) {
    const user = getStore().users.get(id);
    return user ? structuredClone(user) : null;
  },

  async findByEmail(email) {
    const store = getStore();
    const id = store.userIdsByEmail.get(email);
    const user = id ? store.users.get(id) : undefined;
    return user ? structuredClone(user) : null;
  },

  async create(user) {
    const input = structuredClone(user); // copia na escrita
    const store = getStore();
    if (store.userIdsByEmail.has(input.email)) return null;

    const record = {
      id: input.id ?? randomUUID(),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: input.createdAt ?? new Date(),
    };
    store.users.set(record.id, record);
    store.userIdsByEmail.set(record.email, record.id);
    return structuredClone(record);
  },
};
