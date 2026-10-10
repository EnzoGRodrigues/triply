import type {
  CoverUpload,
  LoginAttemptSummary,
  NewTrip,
  NewUser,
  TripPatch,
  TripRecord,
  TripReport,
  TripStats,
  UserRecord,
} from "./types";
import type { TripStatus } from "@/types/api";

/**
 * Contratos da camada de dados. Os serviços (`src/server/**`) falam só com estas
 * interfaces; quem as implementa (memória ou Postgres) é escolhido por `DB_DRIVER`
 * em `src/db/index.ts`. Só existem os métodos de que os serviços precisam.
 *
 * Comportamento comum às duas implementações:
 * - tudo é filtrado pelo `userId` informado (viagem de outro usuário = "não achei");
 * - registros devolvidos são cópias: alterá-los não altera o banco;
 * - `updatedAt` é atualizado em toda modificação.
 */

export interface UsersRepository {
  findById(id: string): Promise<UserRecord | null>;
  /** O e-mail já deve estar normalizado (trim + minúsculas). */
  findByEmail(email: string): Promise<UserRecord | null>;
  /** Cria o usuário; devolve `null` se o e-mail já estiver cadastrado. */
  create(user: NewUser): Promise<UserRecord | null>;
}

export interface TripsRepository {
  /**
   * Viagens do usuário. Ordem: planejadas primeiro (ida mais próxima antes, sem data no
   * fim), depois realizadas (concluídas mais recentemente primeiro); desempate por criação.
   */
  list(userId: string, status?: TripStatus): Promise<TripRecord[]>;
  find(userId: string, id: string): Promise<TripRecord | null>;
  create(userId: string, trip: NewTrip): Promise<TripRecord>;
  /** Devolve `null` se a viagem não existir (ou for de outro usuário). */
  update(userId: string, id: string, patch: TripPatch): Promise<TripRecord | null>;
  /** `false` se a viagem não existir (ou for de outro usuário). */
  remove(userId: string, id: string): Promise<boolean>;
  /**
   * Marca como realizadas, com o relato de cada uma, de forma atômica: se alguma não
   * existir (ou for de outro usuário), nenhuma muda e o retorno é `null`. Quem já era
   * realizada mantém o `completedAt` original. O retorno segue a ordem de `items`.
   */
  complete(
    userId: string,
    items: Array<{ id: string; report: TripReport }>,
  ): Promise<TripRecord[] | null>;
  /** Imagem enviada por upload (`null` se não houver). */
  getCover(userId: string, id: string): Promise<CoverUpload | null>;
  /**
   * Estatísticas do perfil: cidades = distintos `lower(coalesce(city, destination))` e
   * países = distintos `countryCode` entre as realizadas.
   */
  stats(userId: string): Promise<TripStats>;
}

export interface LoginAttemptsRepository {
  /** Falhas desde `since` (exclusive), por e-mail+IP, por IP e por e-mail. */
  summarize(emailHash: string, ipHash: string, since: Date): Promise<LoginAttemptSummary>;
  /** Registra uma falha e apaga as anteriores a `pruneBefore`. */
  record(emailHash: string, ipHash: string, pruneBefore: Date): Promise<void>;
  /** Login bem-sucedido: zera as falhas do par e-mail+IP. */
  clear(emailHash: string, ipHash: string): Promise<void>;
}

export interface Repositories {
  users: UsersRepository;
  trips: TripsRepository;
  loginAttempts: LoginAttemptsRepository;
}
