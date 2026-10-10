import Link from "next/link";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Trip } from "@/types/api";
import { TripCardFace } from "./TripCardFace";

interface TripCardProps {
  trip: Trip;
  /** Posição na lista — escalona a animação de entrada. */
  index?: number;
  /** Acima da dobra: carrega a foto com prioridade. */
  eager?: boolean;
}

/**
 * Cartão de viagem. Realizada → abre o detalhe (`/viagens/[id]`);
 * planejada → abre a edição (`/planos/[id]`) e mostra o lápis no canto.
 */
export function TripCard({ trip, index = 0, eager }: TripCardProps) {
  const planned = trip.status === "planejada";
  return (
    <Link
      href={planned ? `/planos/${trip.id}` : `/viagens/${trip.id}`}
      aria-label={planned ? `Editar plano: ${trip.destination}` : `Ver viagem: ${trip.destination}`}
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
      className={cn(
        "group relative block animate-rise overflow-hidden rounded-card bg-surface shadow-card",
        "transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-offset-4",
      )}
    >
      <TripCardFace trip={trip} eager={eager} />
      {planned ? (
        <span
          aria-hidden
          className="absolute bottom-3 right-3 grid size-8 place-items-center rounded-full bg-white/85 text-primary shadow-sm transition-colors duration-200 group-hover:bg-primary group-hover:text-white"
        >
          <Pencil className="size-4" />
        </span>
      ) : null}
    </Link>
  );
}
