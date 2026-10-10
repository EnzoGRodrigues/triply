import type { Repositories } from "./repositories";

/**
 * Camada de dados do Triply. `DB_DRIVER` escolhe a implementação dos repositórios:
 *  - `memory` (padrão, quando ausente): Maps/arrays no processo, populado com os dados de
 *    demonstração. Não exige `DATABASE_URL`; os dados voltam ao estado inicial ao reiniciar.
 *  - `postgres`: Drizzle + `pg` (exige `DATABASE_URL`).
 *
 * Os serviços importam só `repos` daqui e nunca sabem qual driver está ativo. A
 * implementação Postgres é carregada por `import()` dinâmico, só quando necessária —
 * em modo memória nem o `pg` nem o Drizzle chegam a ser carregados.
 */

export type { Repositories, UsersRepository, TripsRepository, LoginAttemptsRepository } from "./repositories";

export type DbDriver = "memory" | "postgres";

export function getDbDriver(): DbDriver {
  const raw = process.env.DB_DRIVER?.trim().toLowerCase() || "memory";
  if (raw === "memory" || raw === "postgres") return raw;
  throw new Error(`DB_DRIVER inválido ("${process.env.DB_DRIVER}"): use "memory" (padrão) ou "postgres".`);
}

// Cache em globalThis: no `next dev` cada rota pode ter a sua cópia deste módulo e o HMR o
// recarrega; assim o driver é escolhido (e logado) uma única vez por processo.
const globalForRepos = globalThis as typeof globalThis & {
  __triplyRepos?: Promise<Repositories>;
};

async function createRepositories(): Promise<Repositories> {
  if (getDbDriver() === "postgres") {
    if (!process.env.DATABASE_URL) {
      throw new Error("DB_DRIVER=postgres exige DATABASE_URL (veja .env.example).");
    }
    const { createPostgresRepositories, describeDatabaseTarget } = await import("./postgres");
    console.log(`[db] PostgreSQL (${describeDatabaseTarget()}) — os dados são persistentes`);
    return createPostgresRepositories();
  }

  const { createMemoryRepositories } = await import("./memory");
  console.log("[db] banco em memória — os dados voltam ao estado inicial quando o servidor reinicia");
  return createMemoryRepositories();
}

function loadRepositories(): Promise<Repositories> {
  globalForRepos.__triplyRepos ??= createRepositories().catch((error: unknown) => {
    globalForRepos.__triplyRepos = undefined; // configuração errada: tenta de novo na próxima chamada
    throw error;
  });
  return globalForRepos.__triplyRepos;
}

/** Cada método espera o driver carregar e delega para ele (a fachada em si é síncrona). */
function lazy<K extends keyof Repositories>(name: K): Repositories[K] {
  return new Proxy({} as Repositories[K], {
    get(_target, method) {
      if (typeof method !== "string" || method === "then") return undefined;
      return async (...args: unknown[]) => {
        const repository = (await loadRepositories())[name] as unknown as Record<
          string,
          (...methodArgs: unknown[]) => Promise<unknown>
        >;
        return repository[method](...args);
      };
    },
  });
}

export const repos: Repositories = {
  users: lazy("users"),
  trips: lazy("trips"),
  loginAttempts: lazy("loginAttempts"),
};
