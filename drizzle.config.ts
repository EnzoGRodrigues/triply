import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/postgres/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Migrações usam a conexão direta (sem pooler) quando ela existir — é o caso da Neon
    // na Vercel (`DATABASE_URL_UNPOOLED`). Localmente cai em `DATABASE_URL`.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
