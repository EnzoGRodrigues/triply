import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Camada de dados: só `src/db/postgres/**` pode falar com Drizzle ou `pg`. O resto do app
  // (serviços, rotas, scripts) usa os repositórios de `src/db` e funciona também em memória.
  {
    files: ["**/*.{ts,tsx,mjs}"],
    ignores: ["src/db/postgres/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["drizzle-orm", "drizzle-orm/*", "pg"],
              message: "Só src/db/postgres/** importa Drizzle ou pg. Use os repositórios de @/db.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
