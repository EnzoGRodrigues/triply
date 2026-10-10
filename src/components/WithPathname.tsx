"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Entrega o pathname atual a um render prop.
 * Com Cache Components `usePathname()` é dado de requisição (em rotas dinâmicas, como /planos/[id]):
 * use sempre dentro de `<Suspense>` com um fallback sem estado "ativo".
 */
export function WithPathname({ children }: { children: (pathname: string) => ReactNode }) {
  return <>{children(usePathname())}</>;
}
