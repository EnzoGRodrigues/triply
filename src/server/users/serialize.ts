import type { UserRecord } from "@/db/types";
import type { User } from "@/types/api";

/** Registro do banco → `User` do contrato (sem `password_hash`). */
export function serializeUser(row: Pick<UserRecord, "id" | "name" | "email" | "createdAt">): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
  };
}
