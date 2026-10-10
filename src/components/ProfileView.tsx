"use client";

import { useCallback } from "react";
import { Map, NotebookPen, Plane } from "lucide-react";
import { getProfile, listTrips } from "@/lib/api-client";
import { formatMonthYear } from "@/lib/format";
import { useAsyncData } from "@/hooks/useAsyncData";
import { StatsCard } from "./StatsCard";
import { TripCard } from "./TripCard";
import { TripCardSkeleton } from "./TripCardSkeleton";
import { Avatar } from "./ui/Avatar";
import { ButtonLink } from "./ui/ButtonLink";
import { EmptyState } from "./ui/EmptyState";
import { ErrorState } from "./ui/ErrorState";
import { Skeleton } from "./ui/Skeleton";

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5";

/** Tela de perfil: avatar, nome, estatísticas e grid de viagens realizadas. */
export function ProfileView() {
  const fetchProfile = useCallback((signal: AbortSignal) => getProfile(signal), []);
  const fetchTrips = useCallback(
    (signal: AbortSignal) => listTrips("realizada", signal).then((r) => r.trips),
    [],
  );
  const profile = useAsyncData(fetchProfile);
  const trips = useAsyncData(fetchTrips);

  const user = profile.data?.user;
  const stats = profile.data?.stats;

  return (
    <div className="space-y-10">
      <section
        aria-label="Perfil"
        className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left"
      >
        <div className="flex flex-col items-center gap-5 md:flex-row md:gap-7">
          <Avatar size="xl" />
          <div className="min-w-0">
            {user ? (
              <>
                <h1 className="break-anywhere font-display text-[1.75rem] font-normal leading-tight text-text sm:text-4xl">
                  {user.name}
                </h1>
                <p className="mt-1.5 text-text-muted">
                  Viajante desde {formatMonthYear(user.createdAt)}
                  {stats ? (
                    <>
                      {" · "}
                      {stats.completedTrips} {stats.completedTrips === 1 ? "viagem realizada" : "viagens realizadas"}
                      {" · "}
                      {stats.plannedTrips} {stats.plannedTrips === 1 ? "planejada" : "planejadas"}
                    </>
                  ) : null}
                </p>
              </>
            ) : profile.error ? (
              <p className="text-danger-text">Não foi possível carregar seu perfil.</p>
            ) : (
              <div role="status" className="space-y-3">
                <span className="sr-only">Carregando perfil…</span>
                <Skeleton className="mx-auto h-9 w-64 md:mx-0" />
                <Skeleton className="mx-auto h-4 w-72 md:mx-0" />
              </div>
            )}
          </div>
        </div>

        {stats ? (
          <StatsCard cities={stats.cities} countries={stats.countries} className="w-full max-w-sm md:w-auto md:min-w-80" />
        ) : (
          <Skeleton className="h-[7.5rem] w-full max-w-sm rounded-2xl md:w-80" />
        )}
      </section>

      <section aria-labelledby="my-trips">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h2 id="my-trips" className="font-display text-2xl font-normal text-primary">
            Minhas viagens
          </h2>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href="/registrar" icon={<NotebookPen className="size-[18px]" aria-hidden />}>
              Registrar viagem
            </ButtonLink>
            <ButtonLink href="/planos" variant="secondary" icon={<Map className="size-[18px]" aria-hidden />}>
              Planos de viagem
            </ButtonLink>
          </div>
        </div>

        {trips.loading ? (
          <div role="status" className={GRID}>
            <span className="sr-only">Carregando viagens…</span>
            {[0, 1, 2].map((i) => (
              <TripCardSkeleton key={i} />
            ))}
          </div>
        ) : trips.error ? (
          <ErrorState message={trips.error.message} onRetry={trips.reload} />
        ) : trips.data && trips.data.length > 0 ? (
          <ul className={GRID}>
            {trips.data.map((trip, index) => (
              <li key={trip.id}>
                <TripCard trip={trip} index={index} eager={index < 3} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Plane />}
            title="Você ainda não registrou viagens"
            description="Quando voltar de uma viagem planejada, registre como foi — ela aparece aqui e entra nas suas estatísticas."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink href="/registrar">Registrar viagem</ButtonLink>
                <ButtonLink href="/planos/novo" variant="secondary">
                  Planejar uma viagem
                </ButtonLink>
              </div>
            }
          />
        )}
      </section>
    </div>
  );
}
