import { eq } from "drizzle-orm";

import { buildDemoData } from "../demo";
import { getPostgres } from "./connection";
import { trips, users } from "./schema";
import { tripInsertValues } from "./trips";

/**
 * Grava no Postgres os MESMOS dados de demonstração do banco em memória (`src/db/seed-data.ts`,
 * com ids fixos). Idempotente: recria a conta demo (as viagens saem junto, por `ON DELETE CASCADE`).
 */
export async function seedPostgres(): Promise<{ email: string; completed: number; planned: number }> {
  const { user, trips: demoTrips } = buildDemoData();
  const { db } = getPostgres();

  await db.transaction(async (tx) => {
    await tx.delete(users).where(eq(users.email, user.email));
    await tx.insert(users).values({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
    });
    await tx.insert(trips).values(demoTrips.map((trip) => tripInsertValues(user.id as string, trip)));
  });

  return {
    email: user.email,
    completed: demoTrips.filter((trip) => trip.status === "realizada").length,
    planned: demoTrips.filter((trip) => trip.status === "planejada").length,
  };
}
