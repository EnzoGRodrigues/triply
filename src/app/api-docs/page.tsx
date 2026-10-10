import type { Metadata } from "next";
import Link from "next/link";

import { ApiReference } from "./ApiReference";

export const metadata: Metadata = {
  title: "Documentação da API",
  description:
    "Documentação interativa (OpenAPI 3.1) da API REST do Triply: autenticação, viagens e destinos com APIs externas.",
};

export default function ApiDocsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between bg-primary px-4 text-white shadow-nav sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-[family-name:var(--font-lexend)] text-xl font-semibold tracking-tight"
          >
            Triply
          </Link>
          <span aria-hidden className="h-5 w-px bg-white/30" />
          <span className="text-sm text-white/90">Documentação da API</span>
        </div>
        <a
          href="/api/openapi.json"
          className="rounded-md px-2 py-1 text-sm text-white/90 underline-offset-4 hover:underline"
        >
          openapi.json
        </a>
      </header>
      <ApiReference />
    </div>
  );
}
