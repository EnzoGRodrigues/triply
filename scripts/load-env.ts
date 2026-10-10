import { config } from "dotenv";

// Deve ser o primeiro import dos scripts: `src/db` lê DATABASE_URL ao ser carregado.
config({ path: ".env.local" });
