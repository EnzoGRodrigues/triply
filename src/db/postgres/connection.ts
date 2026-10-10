import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

interface DbCache {
  pool: Pool;
  db: Database;
}

// Cache em globalThis: o HMR do `next dev` reavalia os módulos e, sem isso,
// cada recarga abriria um novo pool de conexões.
const globalForDb = globalThis as typeof globalThis & {
  __triplyDb?: DbCache;
};

/**
 * Lê as opções de SSL da URL (`sslmode=require|verify-ca|verify-full` ou
 * `ssl=true`, como nas URLs do Neon). Os parâmetros são removidos da URL e o
 * SSL é configurado explicitamente — assim o `pg` não emite avisos de depreciação.
 */
function resolveConnection(rawUrl: string): PoolConfig {
  const url = new URL(rawUrl);
  const sslmode = url.searchParams.get("sslmode");
  const requiresSsl =
    url.searchParams.get("ssl") === "true" ||
    (sslmode !== null && sslmode !== "disable" && sslmode !== "allow");

  for (const param of ["sslmode", "ssl", "uselibpqcompat", "channel_binding"]) {
    url.searchParams.delete(param);
  }

  return {
    connectionString: url.toString(),
    ssl: requiresSsl ? { rejectUnauthorized: true } : undefined,
  };
}

function createDb(): DbCache {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não definida (veja .env.example).");
  }

  const pool = new Pool({
    ...resolveConnection(databaseUrl),
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  // Erros em conexões ociosas não podem derrubar o processo.
  pool.on("error", (error) => {
    console.error("[db] erro em conexão ociosa do pool:", error.message);
  });

  return { pool, db: drizzle(pool, { schema }) };
}

/** Pool e cliente Drizzle (criados no primeiro uso, não ao importar o módulo). */
export function getPostgres(): DbCache {
  return (globalForDb.__triplyDb ??= createDb());
}

/** Host da `DATABASE_URL` (sem usuário nem senha), só para o log de subida. */
export function describeDatabaseTarget(): string {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "DATABASE_URL inválida";
  }
}

/** Encerra o pool (scripts como o seed precisam disso para o processo terminar). */
export async function closePostgres(): Promise<void> {
  const cache = globalForDb.__triplyDb;
  if (!cache) return;
  globalForDb.__triplyDb = undefined;
  await cache.pool.end();
}
