import { eq } from "drizzle-orm";

import type { UsersRepository } from "../repositories";
import { getPostgres } from "./connection";
import { users } from "./schema";

export const postgresUsers: UsersRepository = {
  async findById(id) {
    const [row] = await getPostgres().db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  },

  async findByEmail(email) {
    const [row] = await getPostgres()
      .db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row ?? null;
  },

  async create({ id, name, email, passwordHash, createdAt }) {
    // `onConflictDoNothing` evita a corrida entre "checar" e "inserir".
    const [row] = await getPostgres()
      .db.insert(users)
      .values({
        ...(id && { id }),
        name,
        email,
        passwordHash,
        ...(createdAt && { createdAt }),
      })
      .onConflictDoNothing({ target: users.email })
      .returning();
    return row ?? null;
  },
};
