import { inArray, or } from "drizzle-orm";

import { buildDemoData } from "../demo";
import { getPostgres } from "./connection";
import { trips, users } from "./schema";
import { tripInsertValues } from "./trips";

export interface SeededAccount {
  email: string;
  completed: number;
  planned: number;
}

/**
 * Grava no Postgres os MESMOS dados de demonstração do banco em memória (`src/db/seed-data.ts`,
 * com ids fixos): as 6 contas, cada uma com as suas 7 viagens. Idempotente: recria as contas de
 * demonstração (as viagens saem junto, por `ON DELETE CASCADE`). Apaga por id OU e-mail, para
 * também substituir uma conta antiga de demonstração que tenha o mesmo id com outro e-mail.
 */
export async function seedPostgres(): Promise<SeededAccount[]> {
  const accounts = buildDemoData();
  const { db } = getPostgres();

  await db.transaction(async (tx) => {
    await tx
      .delete(users)
      .where(
        or(
          inArray(users.id, accounts.map(({ user }) => user.id)),
          inArray(users.email, accounts.map(({ user }) => user.email)),
        ),
      );
    await tx.insert(users).values(
      accounts.map(({ user }) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
      })),
    );
    await tx
      .insert(trips)
      .values(accounts.flatMap(({ user, trips: demoTrips }) => demoTrips.map((trip) => tripInsertValues(user.id, trip))));
  });

  return accounts.map(({ user, trips: demoTrips }) => ({
    email: user.email,
    completed: demoTrips.filter((trip) => trip.status === "realizada").length,
    planned: demoTrips.filter((trip) => trip.status === "planejada").length,
  }));
}
