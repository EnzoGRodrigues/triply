"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getErrorMessage, getFieldErrors, register } from "@/lib/api-client";
import { hardNavigate } from "@/lib/navigation";
import { BackLink } from "./ui/BackLink";
import { Button } from "./ui/Button";
import { TextField } from "./ui/TextField";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = "Informe seu nome completo.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = "Informe um e-mail válido.";
    if (password.length < 6) nextErrors.password = "A senha precisa ter ao menos 6 caracteres.";
    if (!confirmPassword) nextErrors.confirmPassword = "Confirme a senha.";
    else if (confirmPassword !== password) nextErrors.confirmPassword = "As senhas não conferem.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, confirmPassword });
      hardNavigate("/perfil");
    } catch (error) {
      const fields = getFieldErrors(error);
      if (Object.keys(fields).length) setErrors(fields);
      else toast.error(getErrorMessage(error));
      setLoading(false);
    }
  }

  return (
    <div className="animate-rise">
      <BackLink href="/login" label="Voltar ao login" className="mb-6" />
      <div className="mb-8">
        <h1 className="font-display text-3xl font-normal text-primary">Crie sua conta</h1>
        <p className="mt-1.5 text-text-muted">Leva menos de um minuto — depois é só planejar a próxima viagem.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          label="Nome completo"
          name="name"
          autoComplete="name"
          placeholder="Como devemos te chamar?"
          value={name}
          onChange={setName}
          error={errors.name}
          autoFocus
        />
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
        />
        <TextField
          label="Senha"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="Mínimo de 6 caracteres"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />
        <TextField
          label="Confirmar senha"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repita a senha"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={errors.confirmPassword}
        />
        <Button type="submit" size="lg" fullWidth loading={loading} className="mt-2">
          Cadastrar
        </Button>
      </form>

      <p className="mt-6 text-center text-text-muted">
        Já tem uma conta?{" "}
        <Link href="/login" className="font-medium text-primary underline underline-offset-4 hover:text-primary-hover">
          Entrar
        </Link>
      </p>
    </div>
  );
}
