import bcrypt from "bcryptjs";

import { DEMO_PASSWORD, demoTrips, demoUsers } from "./seed-data";
import type { NewTrip, NewUser } from "./types";

/** Mesmo custo do bcrypt usado nas senhas reais (`src/server/auth/password.ts`). */
const BCRYPT_COST = 10;

let cachedHash: string | undefined;

/** Uma conta de demonstração pronta para gravar: usuário (senha já com hash) + as suas 7 viagens. */
export interface DemoAccountData {
  user: NewUser & { id: string };
  trips: NewTrip[];
}

/**
 * As contas de demonstração prontas para gravar. Todas têm a mesma senha pública (`DEMO_PASSWORD`),
 * então o hash do bcrypt é calculado UMA vez por processo (~100 ms) e reaproveitado pelas 6 contas:
 * o custo do cold start não cresce com o número de contas.
 */
export function buildDemoData(): DemoAccountData[] {
  cachedHash ??= bcrypt.hashSync(DEMO_PASSWORD, BCRYPT_COST);
  const passwordHash = cachedHash;
  return demoUsers().map((user) => ({ user: { ...user, passwordHash }, trips: demoTrips(user.id) }));
}
