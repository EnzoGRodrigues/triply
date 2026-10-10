"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { getMe } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { CurrentUserContext } from "@/hooks/useCurrentUser";
import { useReloadOnPageRestore } from "@/hooks/useReloadOnPageRestore";

/** Carrega `/api/auth/me` uma vez e expõe o usuário para o layout autenticado. */
export function UserProvider({ children }: { children: ReactNode }) {
  useReloadOnPageRestore();
  const fetchMe = useCallback((signal: AbortSignal) => getMe(signal).then((r) => r.user), []);
  const { data, loading } = useAsyncData(fetchMe);
  const value = useMemo(() => ({ user: data, loading }), [data, loading]);
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}
