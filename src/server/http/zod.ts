import { z } from "zod";

// Mensagens padrão do zod em português para o que não tiver texto próprio.
z.config(z.locales.ptBR());

export { z };
