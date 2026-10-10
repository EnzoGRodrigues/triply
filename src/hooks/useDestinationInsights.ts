"use client";

import { useEffect, useState } from "react";
import { getDestinationInsights, isAbortError, type InsightsParams } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { DestinationInsightsResponse } from "@/types/api";

export type InsightsStatus = "idle" | "loading" | "ready" | "error";

export interface InsightsState {
  status: InsightsStatus;
  data: DestinationInsightsResponse | null;
}

/**
 * Consulta `/api/destinations/insights` quando o destino geolocalizado (e as datas) mudam.
 * Passe `null` para ficar ocioso (destino ainda não escolhido).
 */
export function useDestinationInsights(params: InsightsParams | null): InsightsState {
  const key = params
    ? [params.name, params.countryCode, params.lat, params.lon, params.start, params.end].join("|")
    : null;
  const debouncedKey = useDebouncedValue(key, 350);
  const [result, setResult] = useState<{
    key: string;
    status: "ready" | "error";
    data: DestinationInsightsResponse | null;
  } | null>(null);

  useEffect(() => {
    if (!params || !debouncedKey || debouncedKey !== key) return;
    const controller = new AbortController();
    getDestinationInsights(params, controller.signal).then(
      (data) => setResult({ key: debouncedKey, status: "ready", data }),
      (error: unknown) => {
        if (isAbortError(error)) return;
        setResult({ key: debouncedKey, status: "error", data: null });
      },
    );
    return () => controller.abort();
    // `params` é derivado de `key`; a chave serializada evita refetch por identidade de objeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKey]);

  if (!key) return { status: "idle", data: null };
  if (result && result.key === key) return { status: result.status, data: result.data };
  return { status: "loading", data: null };
}
