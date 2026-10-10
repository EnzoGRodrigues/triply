import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Logo } from "./Logo";
import { ButtonLink } from "./ui/ButtonLink";

/** Cabeçalho das páginas públicas (/sobre). */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-white/95 shadow-nav backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
        <Link
          href="/perfil"
          aria-label="Triply — ir para o app"
          className="shrink-0 text-2xl leading-none sm:text-[1.7rem]"
        >
          <Logo />
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
          <ButtonLink
            href="/api-docs"
            variant="ghost"
            size="sm"
            icon={<BookOpen className="size-[18px]" aria-hidden />}
            className="max-sm:size-9 max-sm:px-0"
          >
            <span className="max-sm:sr-only">Documentação da API</span>
          </ButtonLink>
          <ButtonLink
            href="/perfil"
            size="sm"
            icon={<ArrowRight className="size-[18px] max-sm:hidden" aria-hidden />}
            className="max-sm:px-3"
          >
            Acessar o app
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
