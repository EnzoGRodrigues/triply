"use client";

import { createContext, useContext } from "react";
import type { User } from "@/types/api";

export interface CurrentUserState {
  user: User | null;
  loading: boolean;
}

export const CurrentUserContext = createContext<CurrentUserState>({ user: null, loading: true });

/** Usuário logado (carregado por `UserProvider` no layout autenticado). */
export function useCurrentUser(): CurrentUserState {
  return useContext(CurrentUserContext);
}
