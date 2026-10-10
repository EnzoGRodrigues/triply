"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Compass, Plus } from "lucide-react";
import { listTrips } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { TripCard } from "./TripCard";
import { TripCardSkeleton } from "./TripCardSkeleton";
import { BackLink } from "./ui/BackLink";
import { ButtonLink } from "./ui/ButtonLink";
import { EmptyState } from "./ui/EmptyState";
import { ErrorState } from "./ui/ErrorState";
import { PageHeader } from "./ui/PageHeader";

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5";

/** Tela "Planos de viagem": grid das viagens planejadas + criação. */
export function PlansView() {
  const fetchPlans = useCallback(
    (signal: AbortSignal) => listTrips("planejada", signal).then((r) => r.trips),
    [],
  );
  const { data: trips, error, loading, reload } = useAsyncData(fetchPlans);

  return (
    <div className="space-y-6">
      <BackLink href="/perfil" label="Voltar ao perfil" />
      <PageHeader
        title="Planos de Viagem"
        subtitle="Destinos que você está organizando. Selecione um plano para editar."
        actions={
          <ButtonLink
            href="/planos/novo"
            icon={<Plus className="size-5" aria-hidden />}
            className="max-md:hidden"
          >
            Nova viagem
          </ButtonLink>
        }
      />

      {loading ? (
        <div role="status" className={GRID}>
          <span className="sr-only">Carregando planos…</span>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <TripCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : trips && trips.length > 0 ? (
        <ul className={GRID}>
          {trips.map((trip, index) => (
            <li key={trip.id}>
              <TripCard trip={trip} index={index} eager={index < 3} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Compass />}
          title="Nenhum plano por aqui ainda"
          description="Escolha um destino, defina as datas e deixe o Triply buscar moeda, clima e uma foto para você."
          action={
            <ButtonLink href="/planos/novo" icon={<Plus className="size-5" aria-hidden />}>
              Planejar primeira viagem
            </ButtonLink>
          }
        />
      )}

      {/* FAB do protótipo mobile (acima da barra inferior) */}
      <Link
        href="/planos/novo"
        aria-label="Nova viagem"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-20 grid size-14 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 transition-[transform,background-color] duration-150 hover:bg-primary-hover active:scale-95 md:hidden"
      >
        <Plus className="size-7" aria-hidden />
      </Link>
    </div>
  );
}
