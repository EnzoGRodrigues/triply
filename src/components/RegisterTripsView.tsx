"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { completeTrips, getErrorMessage, listTrips } from "@/lib/api-client";
import { formatDateRange, todayIso } from "@/lib/format";
import { useAsyncData } from "@/hooks/useAsyncData";
import type { TripReportInput } from "@/types/api";
import { ReportDialog } from "./ReportDialog";
import { SelectableTripCard } from "./SelectableTripCard";
import { TripCardSkeleton } from "./TripCardSkeleton";
import { BackLink } from "./ui/BackLink";
import { Button } from "./ui/Button";
import { ButtonLink } from "./ui/ButtonLink";
import { EmptyState } from "./ui/EmptyState";
import { ErrorState } from "./ui/ErrorState";
import { PageHeader } from "./ui/PageHeader";

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5";

interface Flow {
  ids: string[];
  index: number;
  reports: Record<string, TripReportInput>;
}

/**
 * "Registre uma viagem": seleção múltipla de planos + diálogo "Como foi sua viagem?"
 * passo a passo; ao final chama `POST /api/trips/complete` em lote.
 */
export function RegisterTripsView() {
  const router = useRouter();
  const fetchPlans = useCallback(
    (signal: AbortSignal) => listTrips("planejada", signal).then((r) => r.trips),
    [],
  );
  const { data: trips, error, loading, reload } = useAsyncData(fetchPlans);

  const [selected, setSelected] = useState<string[]>([]);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [saving, setSaving] = useState(false);

  // Ignora ids que já não são planos (ex.: concluídos em outra aba).
  const selectedTrips = (trips ?? []).filter((t) => selected.includes(t.id));
  const currentTrip = flow ? ((trips ?? []).find((t) => t.id === flow.ids[flow.index]) ?? null) : null;
  // Viagem com ida no futuro: não bloqueia (a demo tem planos de 2027), só avisa.
  const futureNotice =
    currentTrip?.startDate && currentTrip.startDate > todayIso()
      ? `Esta viagem está marcada para ${formatDateRange(currentTrip.startDate, currentTrip.endDate)}. Você pode registrá-la mesmo assim.`
      : undefined;
  const isLastStep = flow ? flow.index === flow.ids.length - 1 : false;

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function startFlow() {
    if (!selectedTrips.length) return;
    setFlow({ ids: selectedTrips.map((t) => t.id), index: 0, reports: {} });
  }

  async function finish(current: Flow, reports: Record<string, TripReportInput>) {
    setSaving(true);
    try {
      await completeTrips({ trips: current.ids.map((id) => ({ id, ...(reports[id] ?? {}) })) });
      const count = current.ids.length;
      toast.success(count === 1 ? "Viagem registrada!" : `${count} viagens registradas!`);
      setFlow(null);
      setSelected([]);
      router.push("/perfil");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /**
   * Fechar o diálogo no meio do passo a passo: as viagens já confirmadas (salvas ou puladas)
   * são registradas mesmo assim; as demais continuam como plano.
   */
  async function cancelFlow() {
    if (!flow) return;
    const confirmed = flow.ids.filter((id) => id in flow.reports);
    setFlow(null);
    if (confirmed.length === 0) return;

    setSaving(true);
    try {
      await completeTrips({ trips: confirmed.map((id) => ({ id, ...flow.reports[id] })) });
      const remaining = flow.ids.length - confirmed.length;
      const done = confirmed.length === 1 ? "1 viagem registrada" : `${confirmed.length} viagens registradas`;
      toast.success(
        `${done}. ${remaining === 1 ? "A outra continua" : "As outras continuam"} nos seus planos.`,
      );
      setSelected((prev) => prev.filter((id) => !confirmed.includes(id)));
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function advance(report: TripReportInput) {
    if (!flow || !currentTrip) return;
    const reports = { ...flow.reports, [currentTrip.id]: report };
    if (isLastStep) {
      await finish(flow, reports);
    } else {
      setFlow({ ...flow, reports, index: flow.index + 1 });
    }
  }

  return (
    <div className="space-y-6">
      <BackLink href="/perfil" label="Voltar ao perfil" />
      <PageHeader
        title="Registre uma viagem"
        subtitle="Marque as viagens planejadas que você já realizou e conte como foram."
      />

      {loading ? (
        <div role="status" className={GRID}>
          <span className="sr-only">Carregando planos…</span>
          {[0, 1, 2].map((i) => (
            <TripCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : trips && trips.length > 0 ? (
        <>
          <ul className={GRID}>
            {trips.map((trip, index) => (
              <li key={trip.id}>
                <SelectableTripCard
                  trip={trip}
                  index={index}
                  checked={selected.includes(trip.id)}
                  onChange={(checked) => toggle(trip.id, checked)}
                />
              </li>
            ))}
          </ul>

          <div className="sticky bottom-[5.25rem] z-20 flex justify-center pt-2 md:bottom-6">
            <div className="flex items-center gap-4 rounded-full bg-surface/95 py-2 pl-6 pr-2 shadow-lg ring-1 ring-black/5 backdrop-blur">
              <p aria-live="polite" className="text-sm text-text-muted">
                {selectedTrips.length === 0
                  ? "Selecione ao menos uma viagem"
                  : selectedTrips.length === 1
                    ? "1 viagem selecionada"
                    : `${selectedTrips.length} viagens selecionadas`}
              </p>
              <Button
                size="lg"
                disabled={selectedTrips.length === 0 || saving}
                onClick={startFlow}
                icon={<Check className="size-5" aria-hidden />}
                className="rounded-full"
              >
                Realizado
              </Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<CalendarPlus />}
          title="Nenhuma viagem planejada para registrar"
          description="Planeje uma viagem primeiro — depois que ela acontecer, é só marcar como realizada aqui."
          action={<ButtonLink href="/planos/novo">Planejar uma viagem</ButtonLink>}
        />
      )}

      <ReportDialog
        open={flow !== null}
        trip={currentTrip}
        initial={flow && currentTrip ? flow.reports[currentTrip.id] : undefined}
        step={flow ? { current: flow.index + 1, total: flow.ids.length } : undefined}
        submitLabel={isLastStep ? "Salvar" : "Salvar e continuar"}
        busy={saving}
        notice={futureNotice}
        onClose={cancelFlow}
        onSubmit={advance}
        onSkip={() => advance({})}
        onBack={flow && flow.index > 0 ? () => setFlow({ ...flow, index: flow.index - 1 }) : undefined}
      />
    </div>
  );
}
