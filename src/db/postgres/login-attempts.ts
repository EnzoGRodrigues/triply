import { and, eq, gt, lt, or, sql } from "drizzle-orm";

import type { LoginAttemptsRepository } from "../repositories";
import type { AttemptWindow } from "../types";
import { getPostgres } from "./connection";
import { loginAttempts } from "./schema";

const toWindow = (count: number | string, oldest: Date | string | null): AttemptWindow => ({
  count: Number(count),
  oldest: oldest ? new Date(oldest) : null,
});

export const postgresLoginAttempts: LoginAttemptsRepository = {
  async summarize(emailHash, ipHash, since) {
    const isPair = and(eq(loginAttempts.emailHash, emailHash), eq(loginAttempts.ipHash, ipHash));
    const isIp = eq(loginAttempts.ipHash, ipHash);
    const isEmail = eq(loginAttempts.emailHash, emailHash);

    const [row] = await getPostgres()
      .db.select({
        pair: sql<number>`count(*) filter (where ${isPair})`,
        pairOldest: sql<Date | null>`min(${loginAttempts.createdAt}) filter (where ${isPair})`,
        ip: sql<number>`count(*) filter (where ${isIp})`,
        ipOldest: sql<Date | null>`min(${loginAttempts.createdAt}) filter (where ${isIp})`,
        email: sql<number>`count(*) filter (where ${isEmail})`,
        emailOldest: sql<Date | null>`min(${loginAttempts.createdAt}) filter (where ${isEmail})`,
      })
      .from(loginAttempts)
      .where(and(gt(loginAttempts.createdAt, since), or(isIp, isEmail)));

    return {
      pair: toWindow(row?.pair ?? 0, row?.pairOldest ?? null),
      ip: toWindow(row?.ip ?? 0, row?.ipOldest ?? null),
      email: toWindow(row?.email ?? 0, row?.emailOldest ?? null),
    };
  },

  async record(emailHash, ipHash, pruneBefore) {
    const { db } = getPostgres();
    await db.insert(loginAttempts).values({ emailHash, ipHash });
    await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, pruneBefore));
  },

  async clear(emailHash, ipHash) {
    await getPostgres()
      .db.delete(loginAttempts)
      .where(and(eq(loginAttempts.emailHash, emailHash), eq(loginAttempts.ipHash, ipHash)));
  },
};
