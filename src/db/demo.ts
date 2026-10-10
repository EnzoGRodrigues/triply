import bcrypt from "bcryptjs";

import { DEMO_PASSWORD, demoTrips, demoUser } from "./seed-data";
import type { NewTrip, NewUser } from "./types";

/** Mesmo custo do bcrypt usado nas senhas reais (`src/server/auth/password.ts`). */
const BCRYPT_COST = 10;

let cachedHash: string | undefined;

/**
 * Conta + viagens de demonstração prontas para gravar (senha já com hash).
 * O hash é calculado uma vez por processo (~100 ms) e reaproveitado.
 */
export function buildDemoData(): { user: NewUser; trips: NewTrip[] } {
  cachedHash ??= bcrypt.hashSync(DEMO_PASSWORD, BCRYPT_COST);
  return { user: { ...demoUser(), passwordHash: cachedHash }, trips: demoTrips() };
}
