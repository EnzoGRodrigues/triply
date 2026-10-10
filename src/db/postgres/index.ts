import type { Repositories } from "../repositories";
import { closePostgres, describeDatabaseTarget } from "./connection";
import { postgresLoginAttempts } from "./login-attempts";
import { postgresTrips } from "./trips";
import { postgresUsers } from "./users";

export { closePostgres, describeDatabaseTarget };

export function createPostgresRepositories(): Repositories {
  return { users: postgresUsers, trips: postgresTrips, loginAttempts: postgresLoginAttempts };
}
