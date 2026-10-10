"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Globe, MapPin, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { ApiClientError, deleteTrip, getErrorMessage, getTrip, updateTrip } from "@/lib/api-client";
import {
  companionsLabel,
  formatBRL,
  formatDateRange,
  formatDateTime,
  formatExchange,
  formatTemperature,
  transportLabel,
} from "@/lib/format";
import { useAsyncData } from "@/hooks/useAsyncData";
import type { Trip, TripReportInput } from "@/types/api";
import { CoverImage } from "./CoverImage";
import { ReportDialog } from "./ReportDialog";
import { TransportIcon } from "./TransportIcon";
import { BackLink } from "./ui/BackLink";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { ErrorState } from "./ui/ErrorState";
import { Skeleton } from "./ui/Skeleton";
import { StarRating } from "./ui/StarRating";

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-line/50 py-3 last:border-b-0 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="break-anywhere min-w-0 whitespace-pre-line text-text">{children}</dd>
    </div>
  );
}

/** Tela de detalhe de uma viagem realizada. */
export function TripDetail({ id }: { id: string }) {
  const router = useRouter();
  const fetchTrip = useCallback((signal: AbortSignal) => getTrip(id, signal).then((r) => r.trip), [id]);
  const { data: trip, error, loading, reload, mutate } = useAsyncData(fetchTrip);

  const [reportOpen, setReportOpen] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Viagem ainda planejada não tem detalhe de relato: leva para a edição do plano.
  const isPlanned = trip?.status === "planejada";
  useEffect(() => {
    if (isPlanned) router.replace(`/planos/${id}`);
  }, [isPlanned, id, router]);

  async function handleSaveReport(report: TripReportInput) {
    setSavingReport(true);
    try {
      const res = await updateTrip(id, report);
      mutate(() => res.trip);
      setReportOpen(false);
      toast.success("Relato atualizado!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingReport(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteTrip(id);
      toast.success("Viagem excluída.");
      router.replace("/perfil");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setConfirmDelete(false);
    }
  }

  if (error) {
    const notFound = error instanceof ApiClientError && error.status === 404;
    return (
      <div className="space-y-6">
        <BackLink href="/perfil" label="Voltar ao perfil" />
        <ErrorState
          title={notFound ? "Viagem não encontrada" : "Não foi possível carregar"}
          message={notFound ? "Ela pode ter sido excluída ou não pertence à sua conta." : error.message}
          onRetry={notFound ? undefined : reload}
        />
      </div>
    );
  }

  if (loading || !trip || isPlanned) return <TripDetailSkeleton />;

  return (
    <div className="space-y-6">
      <BackLink href="/perfil" label="Voltar ao perfil" />
      <TripDetailContent
        trip={trip}
        onEditReport={() => setReportOpen(true)}
        onDelete={() => setConfirmDelete(true)}
      />

      <ReportDialog
        open={reportOpen}
        trip={trip}
        initial={{
          rating: trip.rating,
          companions: trip.companions,
          expenses: trip.expenses,
          experience: trip.experience,
        }}
        onClose={() => setReportOpen(false)}
        onSubmit={handleSaveReport}
        busy={savingReport}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        danger
        title="Excluir esta viagem?"
        description={`“${trip.destination}” e o seu relato serão removidos permanentemente. Isso também atualiza suas estatísticas.`}
        confirmLabel="Excluir viagem"
      />
    </div>
  );
}

interface TripDetailContentProps {
  trip: Trip;
  onEditReport: () => void;
  onDelete: () => void;
}

function TripDetailContent({ trip, onEditReport, onDelete }: TripDetailContentProps) {
  const period = formatDateRange(trip.startDate, trip.endDate);
  const hasRate = trip.currencyCode && trip.exchangeRate;
  const hasTemp = trip.tempMin !== null || trip.tempMax !== null;

  return (
    <article className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
      <div className="min-w-0 lg:sticky lg:top-24">
        <CoverImage
          src={trip.coverImageUrl}
          alt={`Foto de ${trip.destination}`}
          eager
          className="aspect-[4/3] w-full rounded-2xl shadow-card sm:aspect-[16/10] lg:aspect-[4/3]"
        />
      </div>

      <div className="min-w-0 rounded-2xl bg-surface p-6 shadow-card sm:p-8">
        <header>
          <h1 className="break-anywhere text-balance font-display text-3xl font-medium leading-tight text-text sm:text-[2.2rem]">
            {trip.destination}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {trip.companions ? <Chip icon={<Users aria-hidden />}>{companionsLabel(trip.companions)}</Chip> : null}
            <Chip icon={<TransportIcon transport={trip.transport} />}>{transportLabel(trip.transport)}</Chip>
            {trip.country && trip.country !== trip.destination ? (
              <Chip icon={<Globe aria-hidden />}>{trip.country}</Chip>
            ) : null}
            <span className="ml-auto">
              <StarRating value={trip.rating} size={24} />
            </span>
          </div>
          {trip.completedAt ? (
            <p className="mt-3 text-xs text-text-muted">Registrada em {formatDateTime(trip.completedAt)}</p>
          ) : null}
        </header>

        <section aria-labelledby="detail-title" className="mt-7">
          <h2 id="detail-title" className="font-display text-xl font-medium text-text">
            Detalhe da viagem
          </h2>
          <dl className="mt-2">
            <DetailRow label="Hospedagem">{trip.accommodation || "—"}</DetailRow>
            <DetailRow label="Atividades">{trip.activities || "—"}</DetailRow>
            <DetailRow label="Período">{period ?? "—"}</DetailRow>
            <DetailRow label="Cotação da moeda">
              {hasRate ? formatExchange(trip.currencyCode, trip.exchangeRate) : "—"}
            </DetailRow>
            <DetailRow label="Temperatura média">
              {hasTemp ? formatTemperature(trip.tempMin, trip.tempMax) : "—"}
            </DetailRow>
            <DetailRow label="Gastos">{trip.expenses !== null ? formatBRL(trip.expenses) : "—"}</DetailRow>
          </dl>
        </section>

        <section aria-labelledby="experience-title" className="mt-7">
          <h2 id="experience-title" className="font-display text-xl font-medium text-text">
            Minha experiência
          </h2>
          {trip.experience ? (
            <p className="break-anywhere mt-2 whitespace-pre-line leading-relaxed text-text">{trip.experience}</p>
          ) : (
            <p className="mt-2 flex items-start gap-2 text-text-muted">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              Você ainda não contou como foi. Use “Editar relato” para registrar sua experiência.
            </p>
          )}
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="secondary" icon={<Pencil className="size-[18px]" aria-hidden />} onClick={onEditReport}>
            Editar relato
          </Button>
          <Button variant="danger" icon={<Trash2 className="size-[18px]" aria-hidden />} onClick={onDelete}>
            Excluir
          </Button>
        </div>
      </div>
    </article>
  );
}

function TripDetailSkeleton() {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">Carregando viagem…</span>
      <Skeleton className="h-9 w-40 rounded-full" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
        <div className="space-y-4 rounded-2xl bg-surface p-6 shadow-card sm:p-8">
          <Skeleton className="h-9 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="mt-6 h-6 w-48" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
          <Skeleton className="mt-6 h-6 w-48" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
