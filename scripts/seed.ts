/**
 * Seed do modo Postgres (`DB_DRIVER=postgres`): recria as 6 contas de demonstração, cada uma
 * com as suas 7 viagens, com os MESMOS dados e ids fixos do banco em memória (`src/db/seed-data.ts`).
 * Idempotente. No modo memória não é preciso rodar nada — o banco já nasce populado.
 *   npm run db:seed
 */
import "./load-env";

import { DEMO_PASSWORD } from "../src/db/seed-data";
import { closePostgres } from "../src/db/postgres";
import { seedPostgres } from "../src/db/postgres/seed";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definida (veja .env.example): o seed grava no Postgres.");
  }
  const accounts = await seedPostgres();
  console.log(`Seed concluído (Postgres): ${accounts.length} contas, todas com a senha ${DEMO_PASSWORD}.`);
  for (const { email, completed, planned } of accounts) {
    console.log(`  ${email} — ${completed} realizadas e ${planned} planejadas`);
  }
}

main()
  .catch((error) => {
    console.error("Falha no seed:", error);
    process.exitCode = 1;
  })
  .finally(() => closePostgres());
