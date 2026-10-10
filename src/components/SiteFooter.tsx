import Link from "next/link";
import { cn } from "@/lib/cn";

/** Rodapé discreto com links para "Sobre o projeto" e a documentação da API. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("px-4 py-6 text-center text-xs text-text-muted sm:px-6", className)}>
      <span>Triply · projeto da disciplina DSW3 · </span>
      <Link href="/sobre" className="font-medium text-primary underline-offset-2 hover:underline">
        Sobre o projeto
      </Link>
      <span> · </span>
      <Link href="/api-docs" className="font-medium text-primary underline-offset-2 hover:underline">
        Documentação da API
      </Link>
    </footer>
  );
}
