"use client";

import { useEffect } from "react";

/**
 * Se o navegador restaurar a página do cache de ida e volta (bfcache) — ex.: botão "Voltar"
 * depois de um logout —, recarrega: o proxy então revalida a sessão e redireciona para /login.
 */
export function useReloadOnPageRestore(): void {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);
}
