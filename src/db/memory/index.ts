import type { Repositories } from "../repositories";
import { memoryLoginAttempts } from "./login-attempts";
import { memoryTrips } from "./trips";
import { memoryUsers } from "./users";

export function createMemoryRepositories(): Repositories {
  return { users: memoryUsers, trips: memoryTrips, loginAttempts: memoryLoginAttempts };
}
