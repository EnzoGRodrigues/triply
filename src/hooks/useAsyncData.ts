"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiClientError, isAbortError } from "@/lib/api-client";

interface Settled<T> {
  fetcher: unknown;
  data: T | null;
  error: Error | null;
}

export interface AsyncData<T> {
  data: T | null;
  error: Error | null;
  /** `true` até a primeira resposta (ou ao trocar de `fetcher`). Recargas mantêm os dados antigos. */
  loading: boolean;
  /** Busca de novo; se estava em erro, volta para `loading`. */
  reload: () => void;
  /** Atualiza os dados em memória (ex.: remover um item sem refazer a busca). */
  mutate: (updater: (current: T) => T) => void;
}

/**
 * Carrega dados de forma assíncrona.
 *
 * - Passe um `fetcher` estável (`useCallback`): trocar o fetcher dispara nova busca.
 * - Com `cacheComponents` o Next preserva páginas ocultas (Activity); ao reexibir, os
 *   efeitos rodam de novo, então os dados são revalidados em segundo plano sem piscar.
 * - Erros 401 já redirecionam para /login (api-client) e não aparecem como erro de tela.
 */
export function useAsyncData<T>(fetcher: (signal: AbortSignal) => Promise<T>): AsyncData<T> {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetcher(controller.signal).then(
      (data) => setSettled({ fetcher, data, error: null }),
      (error: unknown) => {
        if (isAbortError(error)) return;
        if (error instanceof ApiClientError && error.isAuthRedirect) return;
        const err = error instanceof Error ? error : new Error("Erro desconhecido");
        // Se já havia dados desta busca, mantém-nos em vez de trocar por uma tela de erro.
        setSettled((prev) =>
          prev && prev.fetcher === fetcher && prev.data !== null
            ? prev
            : { fetcher, data: null, error: err },
        );
      },
    );
    return () => controller.abort();
  }, [fetcher, tick]);

  const current = settled && settled.fetcher === fetcher ? settled : null;

  const reload = useCallback(() => {
    setSettled((prev) => (prev?.error ? null : prev));
    setTick((t) => t + 1);
  }, []);

  const mutate = useCallback((updater: (current: T) => T) => {
    setSettled((prev) =>
      prev && prev.data !== null ? { ...prev, data: updater(prev.data) } : prev,
    );
  }, []);

  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: current === null,
    reload,
    mutate,
  };
}
