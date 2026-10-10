"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiClientError, deleteTrip, getTrip, updateTrip } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import type { TripInput } from "@/types/api";
import { TripForm } from "./TripForm";
import { BackLink } from "./ui/BackLink";
import { ErrorState } from "./ui/ErrorState";
import { PageHeader } from "./ui/PageHeader";
import { Skeleton } from "./ui/Skeleton";

/** Tela "Edite seu plano de viagem". */
export function EditTripView({ id }: { id: string }) {
  const router = useRouter();
  const fetchTrip = useCallback((signal: AbortSignal) => getTrip(id, signal).then((r) => r.trip), [id]);
  const { data: trip, error, loading, reload } = useAsyncData(fetchTrip);

  // Viagem já realizada não se edita como plano: abre o detalhe.
  const isDone = trip?.status === "realizada";
  useEffect(() => {
    if (isDone) router.replace(`/viagens/${id}`);
  }, [isDone, id, router]);

  async function handleSubmit(input: TripInput) {
    await updateTrip(id, input);
    toast.success("Plano atualizado!");
    router.push("/planos");
  }

  async function handleDelete() {
    await deleteTrip(id);
    toast.success("Plano excluído.");
    router.replace("/planos");
  }

  if (error) {
    const notFound = error instanceof ApiClientError && error.status === 404;
    return (
      <div className="space-y-6">
        <BackLink href="/planos" label="Planos de viagem" />
        <ErrorState
          title={notFound ? "Plano não encontrado" : "Não foi possível carregar"}
          message={notFound ? "Ele pode ter sido excluído ou não pertence à sua conta." : error.message}
          onRetry={notFound ? undefined : reload}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink href="/planos" label="Planos de viagem" />
      <PageHeader title="Edite seu plano de viagem" />
      {loading || !trip || isDone ? (
        <div role="status" className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <span className="sr-only">Carregando plano…</span>
          <Skeleton className="h-[34rem] rounded-2xl" />
          <Skeleton className="h-[34rem] rounded-2xl" />
        </div>
      ) : (
        <TripForm key={trip.id} trip={trip} onSubmit={handleSubmit} onDelete={handleDelete} />
      )}
    </div>
  );
}
