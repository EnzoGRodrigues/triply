"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getErrorMessage, getFieldErrors, login } from "@/lib/api-client";
import { hardNavigate } from "@/lib/navigation";
import { safeNextPath } from "@/server/auth/next-path";
import { Logo } from "./Logo";
import { Button } from "./ui/Button";
import { TextField } from "./ui/TextField";

export function LoginForm() {
  const searchParams = useSearchParams();
  // Só caminhos internos do app (evita open redirect) — mesma regra do proxy.
  const next = safeNextPath(searchParams.get("next")) ?? "/perfil";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!email.trim()) nextErrors.email = "Informe seu e-mail.";
    if (!password) nextErrors.password = "Informe sua senha.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      hardNavigate(next);
    } catch (error) {
      const fields = getFieldErrors(error);
      if (Object.keys(fields).length) setErrors(fields);
      else toast.error(getErrorMessage(error));
      setLoading(false);
    }
  }

  return (
    <div className="animate-rise">
      <div className="mb-8 text-center lg:hidden">
        <Logo className="text-6xl" />
      </div>
      <div className="mb-8 max-lg:text-center">
        <h1 className="font-display text-3xl font-normal text-primary">Bem-vindo de volta</h1>
        <p className="mt-1.5 text-text-muted">Entre para continuar planejando suas viagens.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          label="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@email.com"
          value={email}
          onChange={setEmail}
          error={errors.email}
          autoFocus
        />
        <TextField
          label="Senha"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />
        <Button type="submit" size="lg" fullWidth loading={loading} className="mt-2">
          Entrar
        </Button>
      </form>

      <p className="mt-6 text-center text-text-muted">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-primary underline underline-offset-4 hover:text-primary-hover">
          Crie sua conta
        </Link>
      </p>
    </div>
  );
}
