"use client";

import { useState, type FormEvent } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage, getFieldErrors } from "@/lib/api-client";
import { TRANSPORT_OPTIONS } from "@/lib/format";
import { useDestinationInsights } from "@/hooks/useDestinationInsights";
import type { DestinationResult, Transport, Trip, TripInput } from "@/types/api";
import { coverSourceFrom, CoverImagePicker, type CoverChoice } from "./CoverImagePicker";
import { DestinationAutocomplete } from "./DestinationAutocomplete";
import { DestinationInsightsPanel } from "./DestinationInsightsPanel";
import { TransportIcon } from "./TransportIcon";
import { Button } from "./ui/Button";
import { ButtonLink } from "./ui/ButtonLink";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { DateField } from "./ui/DateField";
import { SegmentedControl } from "./ui/SegmentedControl";
import { TextField } from "./ui/TextField";
import { Textarea } from "./ui/Textarea";

/** Geolocalização escolhida no autocomplete (ou herdada da viagem salva). */
interface Geo {
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  latitude: number;
  longitude: number;
}

interface TripFormProps {
  /** Presente na edição. */
  trip?: Trip;
  /** Salva. Deve lançar em caso de erro (o formulário mostra os erros por campo/toast). */
  onSubmit: (input: TripInput) => Promise<void>;
  /** Exclui (somente na edição). */
  onDelete?: () => Promise<void>;
}

function geoFromTrip(trip?: Trip): Geo | null {
  if (!trip || trip.latitude === null || trip.longitude === null) return null;
  return {
    city: trip.city,
    region: trip.region,
    country: trip.country,
    countryCode: trip.countryCode,
    latitude: trip.latitude,
    longitude: trip.longitude,
  };
}

const TRANSPORT_ICON_OPTIONS = TRANSPORT_OPTIONS.map((o) => ({
  ...o,
  icon: <TransportIcon transport={o.value} className="size-4" />,
}));

/** Formulário de plano de viagem (criar/editar) com o painel "Sobre o destino" ao lado. */
export function TripForm({ trip, onSubmit, onDelete }: TripFormProps) {
  const editing = Boolean(trip);

  const [destination, setDestination] = useState(trip?.destination ?? "");
  const [geo, setGeo] = useState<Geo | null>(() => geoFromTrip(trip));
  const [startDate, setStartDate] = useState(trip?.startDate ?? "");
  const [endDate, setEndDate] = useState(trip?.endDate ?? "");
  const [accommodation, setAccommodation] = useState(trip?.accommodation ?? "");
  const [activities, setActivities] = useState(trip?.activities ?? "");
  const [transport, setTransport] = useState<Transport>(trip?.transport ?? "aviao");
  /** `null` = o usuário ainda não mexeu na capa. */
  const [coverChoice, setCoverChoice] = useState<CoverChoice | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const datesInvalid = Boolean(startDate && endDate && endDate < startDate);
  const datesValid = Boolean(startDate && endDate && !datesInvalid);
  // Com período invertido não consulta as APIs (evita mostrar clima/cotação de outro período).
  const insights = useDestinationInsights(
    geo && !datesInvalid
      ? {
          name: destination.trim() || geo.city || "",
          countryCode: geo.countryCode,
          lat: geo.latitude,
          lon: geo.longitude,
          start: datesValid ? startDate : null,
          end: datesValid ? endDate : null,
        }
      : null,
  );
  const suggestion = insights.data?.image ?? null;

  const effectiveCover: CoverChoice =
    coverChoice ??
    (trip?.coverImageUrl
      ? { kind: "existing", url: trip.coverImageUrl }
      : suggestion
        ? { kind: "suggested", url: suggestion.url, source: coverSourceFrom(suggestion) }
        : { kind: "none" });
  const suggestedInUse =
    (effectiveCover.kind === "suggested" || effectiveCover.kind === "existing") &&
    effectiveCover.url === suggestion?.url;

  function clearError(field: string) {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleSelect(result: DestinationResult) {
    // O `label` da busca já vem no formato de destino ("Barra Grande - Piauí", "Tulum, México").
    setDestination(result.label);
    setGeo({
      city: result.name,
      region: result.region,
      country: result.country,
      countryCode: result.countryCode,
      latitude: result.latitude,
      longitude: result.longitude,
    });
    clearError("destination");
  }

  function buildPayload(): TripInput {
    const payload: TripInput = {
      destination: destination.trim(),
      city: geo?.city ?? null,
      region: geo?.region ?? null,
      country: geo?.country ?? null,
      countryCode: geo?.countryCode ?? null,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      startDate: startDate || null,
      endDate: endDate || null,
      accommodation: accommodation.trim() || null,
      activities: activities.trim() || null,
      transport,
    };

    // Capa: omitir = manter (edição) / back-end busca uma automática (criação).
    if (coverChoice === null) {
      if (effectiveCover.kind === "suggested") {
        payload.coverImage = effectiveCover.url;
        payload.coverImageSource = effectiveCover.source;
      }
    } else if (coverChoice.kind === "upload") {
      payload.coverImage = coverChoice.dataUrl;
      payload.coverImageSource = "upload";
    } else if (coverChoice.kind === "suggested") {
      payload.coverImage = coverChoice.url;
      payload.coverImageSource = coverChoice.source;
    } else if (coverChoice.kind === "none") {
      payload.coverImage = null;
      payload.coverImageSource = null;
    }
    return payload;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!destination.trim()) nextErrors.destination = "Informe o destino da viagem.";
    if (datesInvalid) nextErrors.endDate = "A volta não pode ser antes da ida.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.getElementById(nextErrors.destination ? "trip-destination" : "trip-end")?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(buildPayload());
    } catch (error) {
      const fields = getFieldErrors(error);
      if (Object.keys(fields).length) setErrors(fields);
      toast.error(Object.keys(fields).length ? "Revise os campos destacados." : getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    try {
      await onDelete();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <section
          aria-label="Dados da viagem"
          className="space-y-5 rounded-2xl bg-surface p-5 shadow-card sm:p-6"
        >
          <DestinationAutocomplete
            id="trip-destination"
            value={destination}
            onChange={(text) => {
              setDestination(text);
              setGeo(null);
              clearError("destination");
            }}
            onSelect={handleSelect}
            error={errors.destination}
          />

          <div className="grid grid-cols-2 gap-3">
            <DateField
              id="trip-start"
              label="Ida"
              value={startDate}
              onChange={(v) => {
                setStartDate(v);
                clearError("startDate");
                clearError("endDate");
              }}
              error={errors.startDate}
            />
            <DateField
              id="trip-end"
              label="Volta"
              value={endDate}
              min={startDate || undefined}
              onChange={(v) => {
                setEndDate(v);
                clearError("endDate");
              }}
              error={errors.endDate ?? (datesInvalid ? "A volta não pode ser antes da ida." : undefined)}
            />
          </div>

          <TextField
            label="Hospedagem"
            value={accommodation}
            onChange={setAccommodation}
            placeholder="Hotel, hostel, casa de amigos…"
            error={errors.accommodation}
            maxLength={200}
          />

          <Textarea
            label="Atividades planejadas"
            value={activities}
            onChange={setActivities}
            placeholder="O que você quer fazer por lá?"
            error={errors.activities}
            maxLength={2000}
          />

          <SegmentedControl
            label="Transporte"
            value={transport}
            onChange={setTransport}
            options={TRANSPORT_ICON_OPTIONS}
          />
        </section>

        <DestinationInsightsPanel
          destination={destination}
          state={insights}
          startDate={datesInvalid ? undefined : startDate}
          endDate={datesInvalid ? undefined : endDate}
          invalidDates={datesInvalid}
          saved={trip && geo ? trip : null}
          suggestedInUse={suggestedInUse}
          onUseSuggestedImage={
            suggestion
              ? () =>
                  setCoverChoice({
                    kind: "suggested",
                    url: suggestion.url,
                    source: coverSourceFrom(suggestion),
                  })
              : undefined
          }
        />

        <CoverImagePicker
          value={effectiveCover}
          suggestion={suggestion}
          onChange={setCoverChoice}
          className="lg:col-span-2"
        />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
          <div>
            {editing && onDelete ? (
              <Button
                variant="danger"
                icon={<Trash2 className="size-[18px]" aria-hidden />}
                onClick={() => setConfirmDelete(true)}
                className="max-sm:w-full"
              >
                Excluir
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/planos" variant="ghost" className="max-sm:w-full">
              Cancelar
            </ButtonLink>
            <Button
              type="submit"
              loading={submitting}
              icon={<Check className="size-[18px]" aria-hidden />}
              className="max-sm:w-full sm:min-w-36"
            >
              Salvar
            </Button>
          </div>
        </div>
      </form>

      {editing && onDelete ? (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
          danger
          title="Excluir este plano?"
          description={`“${trip?.destination}” será removido permanentemente. Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir plano"
        />
      ) : null}
    </>
  );
}
