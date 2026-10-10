import { z } from "@/server/http/zod";

const email = z
  .string({ error: "Informe o e-mail." })
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .min(1, "Informe o e-mail.")
      .max(254, "O e-mail deve ter no máximo 254 caracteres.")
      .pipe(z.email("Informe um e-mail válido.")),
  );

/** bcrypt só considera os 72 primeiros bytes da senha. */
const MAX_PASSWORD_BYTES = 72;

export const registerSchema = z
  .object({
    name: z
      .string({ error: "Informe seu nome." })
      .trim()
      .min(2, "O nome deve ter ao menos 2 caracteres.")
      .max(100, "O nome deve ter no máximo 100 caracteres."),
    email,
    password: z
      .string({ error: "Informe a senha." })
      .min(6, "A senha deve ter ao menos 6 caracteres.")
      .refine(
        (value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES,
        "A senha deve ter no máximo 72 caracteres.",
      ),
    confirmPassword: z.string({ error: "Confirme a senha." }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export const loginSchema = z.object({
  email,
  password: z
    .string({ error: "Informe a senha." })
    .min(1, "Informe a senha.")
    .max(1000, "Senha inválida."),
});
