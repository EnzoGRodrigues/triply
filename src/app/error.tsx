"use client";

import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ErrorState } from "@/components/ui/ErrorState";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-8 px-5 py-12">
      <Logo className="justify-center text-5xl" />
      <ErrorState
        title="Algo saiu do roteiro"
        message="Ocorreu um erro inesperado ao exibir esta página. Tente novamente."
        onRetry={reset}
      />
      <ButtonLink href="/perfil" variant="ghost" className="mx-auto">
        Ir para o meu perfil
      </ButtonLink>
    </main>
  );
}
