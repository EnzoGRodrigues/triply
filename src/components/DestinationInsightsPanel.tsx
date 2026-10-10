import Image from "next/image";
import { Banknote, Check, Flag, Globe, ImageIcon, ThermometerSun } from "lucide-react";
import type { InsightsState } from "@/hooks/useDestinationInsights";
import { formatDateRange, formatDateTime, formatExchange, formatTemperature } from "@/lib/format";
import type { Trip } from "@/types/api";
import { ExternalSource } from "./ExternalSource";
import { CoverImage } from "./CoverImage";
import { InsightRow } from "./InsightRow";
import { Button } from "./ui/Button";
import { Skeleton } from "./ui/Skeleton";

interface DestinationInsightsPanelProps {
  destination: string;
  state: InsightsState;
  startDate?: string;
  endDate?: string;
  /** Dados já salvos na viagem — exibidos se a API externa falhar na edição. */
  saved?: Pick<Trip, "currencyCode" | "exchangeRate" | "tempMin" | "tempMax"> | null;
  /** Volta antes da ida: não consulta nada e mostra um aviso neutro. */
  invalidDates?: boolean;
  /** Imagem sugerida está em uso como capa? */
  suggestedInUse?: boolean;
  onUseSuggestedImage?: () => void;
}

/**
 * Painel "Sobre o destino": consome `/api/destinations/insights` (país, moeda e cotação,
 * temperatura média e imagem sugerida) e mostra a FONTE de cada dado.
 * Cada bloco falha sozinho e vira "Indisponível".
 */
export function DestinationInsightsPanel({
  destination,
  state,
  startDate,
  endDate,
  saved,
  invalidDates,
  suggestedInUse,
  onUseSuggestedImage,
}: DestinationInsightsPanelProps) {
  const { status, data } = state;
  const range = formatDateRange(startDate, endDate);
  const hasBothDates = Boolean(startDate && endDate);

  return (
    <section aria-labelledby="insights-title" className="rounded-2xl bg-surface p-5 shadow-card sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="insights-title" className="font-display text-xl font-medium text-primary">
            Sobre o destino
          </h2>
          <p className="truncate text-sm text-text-muted">{destination.trim() || "Escolha um destino"}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary-faint px-2.5 py-1 text-[0.7rem] font-medium text-primary">
          APIs externas
        </span>
      </div>

      {status === "idle" ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-8 text-center">
          <Globe className="size-8 text-primary/70" aria-hidden />
          <p className="max-w-xs text-sm text-text-muted">
            {invalidDates
              ? "A volta está antes da ida. Corrija as datas para atualizar moeda, clima e imagem do destino."
              : "Escolha um destino na lista de sugestões para ver país, moeda, cotação, clima e uma imagem de capa."}
          </p>
        </div>
      ) : status === "loading" ? (
        <div role="status" aria-live="polite" className="space-y-5">
          <span className="sr-only">Consultando informações do destino…</span>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3.5">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-52" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <dl className="space-y-5">
          <InsightRow
            icon={<Flag />}
            label="País"
            value={
              data?.country ? (
                <span className="inline-flex items-center gap-2">
                  {data.country.flagUrl ? (
                    <Image
                      src={data.country.flagUrl}
                      alt={`Bandeira: ${data.country.name}`}
                      width={28}
                      height={20}
                      unoptimized
                      className="h-5 w-7 rounded-[3px] object-cover shadow-sm ring-1 ring-black/10"
                    />
                  ) : null}
                  {data.country.name}
                </span>
              ) : null
            }
            source="world-countries (dataset) · bandeira: FlagCDN"
          />

          <InsightRow
            icon={<Banknote />}
            label="Moeda e cotação"
            value={
              data?.currency
                ? data.currency.code === "BRL"
                  ? "R$ 1,00 (moeda local)"
                  : data.currency.label
                : saved?.currencyCode && saved.exchangeRate
                  ? formatExchange(saved.currencyCode, saved.exchangeRate)
                  : null
            }
            detail={
              data?.currency && data.currency.code !== "BRL" && data.currency.name
                ? `${data.currency.name} (${data.currency.code})`
                : undefined
            }
            source={
              data?.currency ? (
                data.currency.code === "BRL" ? undefined : (
                  <>
                    <ExternalSource name={data.currency.source} href={data.currency.sourceUrl} /> · atualizado
                    em {formatDateTime(data.currency.updatedAt)}
                  </>
                )
              ) : (
                "salvo neste plano"
              )
            }
          />

          <InsightRow
            icon={<ThermometerSun />}
            label="Temperatura média"
            value={
              data?.climate
                ? data.climate.label
                : saved?.tempMin != null || saved?.tempMax != null
                  ? formatTemperature(saved?.tempMin, saved?.tempMax)
                  : null
            }
            detail={
              data?.climate
                ? range && hasBothDates
                  ? `Para o período ${range}`
                  : "Informe ida e volta para estimar o período da viagem"
                : undefined
            }
            source={
              data?.climate ? (
                <>
                  <ExternalSource name="Open-Meteo" href="https://open-meteo.com/" /> (CC BY 4.0) ·{" "}
                  {data.climate.source === "previsao"
                    ? "previsão do tempo"
                    : "média das mesmas datas no ano anterior"}
                </>
              ) : (
                "salvo neste plano"
              )
            }
          />

          <InsightRow
            icon={<ImageIcon />}
            label="Imagem sugerida"
            value={data?.image ? "Foto do destino" : null}
            source={
              data?.image ? <ExternalSource name={data.image.source} href={data.image.pageUrl} /> : undefined
            }
            detail={
              data?.image ? (
                <span className="mt-2 block">
                  <CoverImage
                    src={data.image.url}
                    alt={`Imagem sugerida de ${destination}`}
                    eager
                    className="block aspect-[16/9] w-full max-w-64 rounded-xl"
                  />
                  {data.image.attribution || data.image.license ? (
                    <span className="mt-1.5 block text-xs text-text-muted/85">
                      Foto:{" "}
                      {data.image.pageUrl ? (
                        <ExternalSource
                          name={[data.image.attribution, data.image.license].filter(Boolean).join(" · ")}
                          href={data.image.pageUrl}
                        />
                      ) : (
                        [data.image.attribution, data.image.license].filter(Boolean).join(" · ")
                      )}
                    </span>
                  ) : null}
                  {onUseSuggestedImage ? (
                    <Button
                      variant={suggestedInUse ? "secondary" : "outline"}
                      size="sm"
                      className="mt-2.5"
                      disabled={suggestedInUse}
                      onClick={onUseSuggestedImage}
                      icon={suggestedInUse ? <Check className="size-4" aria-hidden /> : undefined}
                    >
                      {suggestedInUse ? "Em uso como capa" : "Usar como capa"}
                    </Button>
                  ) : null}
                </span>
              ) : undefined
            }
          />

          {status === "error" ? (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger-text">
              Não foi possível consultar as APIs externas agora. Você ainda pode salvar o plano — os dados
              serão preenchidos depois.
            </p>
          ) : null}
        </dl>
      )}
    </section>
  );
}
