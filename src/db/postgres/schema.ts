import { sql } from "drizzle-orm";
import {
  check,
  date,
  doublePrecision,
  index,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const tripStatus = pgEnum("trip_status", ["planejada", "realizada"]);
export const transport = pgEnum("transport", ["aviao", "carro", "onibus"]);
export const coverSource = pgEnum("cover_source", [
  "upload",
  "wikipedia",
  "externa",
]);
export const companions = pgEnum("companions", [
  "sozinho",
  "casal",
  "familia",
  "amigos",
  "trabalho",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    /** Sempre normalizado (trim + minúsculas) antes de gravar/consultar. */
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("users_email_lowercase_check", sql`${table.email} = lower(${table.email})`),
  ],
);

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: tripStatus("status").notNull().default("planejada"),

    destination: text("destination").notNull(),
    city: text("city"),
    region: text("region"),
    country: text("country"),
    countryCode: varchar("country_code", { length: 2 }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),

    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),

    accommodation: text("accommodation"),
    activities: text("activities"),
    transport: transport("transport").notNull().default("aviao"),

    currencyCode: varchar("currency_code", { length: 3 }),
    exchangeRate: numeric("exchange_rate", { precision: 14, scale: 6 }),
    exchangeRateAt: timestamp("exchange_rate_at", { withTimezone: true }),

    tempMin: numeric("temp_min", { precision: 4, scale: 1 }),
    tempMax: numeric("temp_max", { precision: 4, scale: 1 }),

    /**
     * URL externa (https) ou data URL do upload.
     * Invariante: é data URL ⇔ `coverImageSource = 'upload'`.
     */
    coverImage: text("cover_image"),
    coverImageSource: coverSource("cover_image_source"),

    completedAt: timestamp("completed_at", { withTimezone: true }),
    rating: smallint("rating"),
    companions: companions("companions"),
    expenses: numeric("expenses", { precision: 12, scale: 2 }),
    experience: text("experience"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("trips_user_id_status_idx").on(table.userId, table.status),
    check(
      "trips_dates_check",
      sql`${table.endDate} IS NULL OR ${table.startDate} IS NULL OR ${table.endDate} >= ${table.startDate}`,
    ),
    check(
      "trips_rating_check",
      sql`${table.rating} IS NULL OR ${table.rating} BETWEEN 1 AND 5`,
    ),
    check(
      "trips_expenses_check",
      sql`${table.expenses} IS NULL OR ${table.expenses} >= 0`,
    ),
  ],
);

/**
 * Tentativas de login que falharam — base do limite de tentativas (funciona em
 * serverless porque o estado fica no banco, não na memória). E-mail e IP são
 * guardados só como HMAC (nunca em claro) e as linhas antigas são apagadas.
 */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    emailHash: text("email_hash").notNull(),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("login_attempts_email_idx").on(table.emailHash, table.createdAt),
    index("login_attempts_ip_idx").on(table.ipHash, table.createdAt),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type TripRow = typeof trips.$inferSelect;
export type NewTripRow = typeof trips.$inferInsert;
