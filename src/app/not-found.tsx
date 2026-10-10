import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-8 px-5 py-12">
      <Logo className="justify-center text-5xl" />
      <EmptyState
        icon={<Compass />}
        title="Página não encontrada"
        description="Esse destino não existe no mapa. Volte ao início e continue sua viagem."
        action={<ButtonLink href="/perfil">Ir para o meu perfil</ButtonLink>}
      />
    </main>
  );
}
