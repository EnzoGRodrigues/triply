"use client";

import { useId, type ReactNode } from "react";
import { ArrowLeft, CalendarClock } from "lucide-react";
import type { Trip, TripReportInput } from "@/types/api";
import { ReportFields } from "./ReportFields";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";

interface ReportDialogProps {
  open: boolean;
  trip: Trip | null;
  /** Valores iniciais (ex.: relato já salvo ao editar). */
  initial?: TripReportInput;
  onClose: () => void;
  onSubmit: (report: TripReportInput) => void | Promise<void>;
  /** Se informado, mostra o botão "Pular" (registrar sem relato). */
  onSkip?: () => void | Promise<void>;
  /** Aviso informativo no topo (ex.: viagem com datas futuras). */
  notice?: ReactNode;
  /** Passo a passo de várias viagens: "Viagem 2 de 3" + botão Voltar. */
  step?: { current: number; total: number };
  onBack?: () => void;
  submitLabel?: string;
  /** Envio em andamento — bloqueia os botões e o fechamento. */
  busy?: boolean;
}

/**
 * Diálogo "Como foi sua viagem?" — usado em "Registrar viagem" (passo a passo)
 * e em "Editar relato" no detalhe.
 */
export function ReportDialog({
  open,
  trip,
  initial,
  onClose,
  onSubmit,
  onSkip,
  notice,
  step,
  onBack,
  submitLabel = "Salvar",
  busy = false,
}: ReportDialogProps) {
  const formId = useId();
  const description = trip
    ? step && step.total > 1
      ? `${trip.destination} · viagem ${step.current} de ${step.total}`
      : trip.destination
    : undefined;

  return (
    <Dialog
      open={open && trip !== null}
      onClose={onClose}
      title="Como foi sua viagem?"
      description={description}
      dismissible={!busy}
      footer={
        <>
          {onBack ? (
            <Button
              variant="ghost"
              onClick={onBack}
              disabled={busy}
              icon={<ArrowLeft className="size-4" aria-hidden />}
              className="mr-auto"
            >
              Voltar
            </Button>
          ) : null}
          {onSkip ? (
            <Button variant="ghost" onClick={() => void onSkip()} disabled={busy}>
              Pular
            </Button>
          ) : null}
          <Button type="submit" form={formId} loading={busy}>
            {submitLabel}
          </Button>
        </>
      }
    >
      {trip && notice ? (
        <p
          role="note"
          className="mb-4 flex items-start gap-2.5 rounded-lg bg-[#fff4d6] px-3.5 py-3 text-sm text-[#6b4500]"
        >
          <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="break-anywhere">{notice}</span>
        </p>
      ) : null}
      {trip ? (
        <ReportFields
          key={trip.id}
          formId={formId}
          initial={initial}
          onSubmit={(report) => void onSubmit(report)}
        />
      ) : null}
    </Dialog>
  );
}
