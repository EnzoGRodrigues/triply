import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateRange } from "@/lib/format";
import type { Trip } from "@/types/api";
import { CoverImage } from "./CoverImage";
import { StarRating } from "./ui/StarRating";

interface TripCardFaceProps {
  trip: Trip;
  /** Elemento pai deve ter a classe `group` para o zoom/clareamento no hover. */
  className?: string;
  /** Acima da dobra: carrega a foto com prioridade. */
  eager?: boolean;
}

/**
 * Visual do cartão de destino: foto "lavada" (sobreposição clara), título do destino em
 * Lexend à esquerda e, abaixo, estrelas (realizada) e/ou período da viagem.
 */
export function TripCardFace({ trip, className, eager }: TripCardFaceProps) {
  const range = formatDateRange(trip.startDate, trip.endDate);
  const showStars = trip.status === "realizada" && trip.rating;

  return (
    <div className={cn("relative h-36 w-full overflow-hidden sm:h-40", className)}>
      <CoverImage
        src={trip.coverImageUrl}
        alt=""
        eager={eager}
        className="absolute inset-0"
        imageClassName="transition-transform duration-700 ease-out group-hover:scale-105"
      />
      {/* "Lavado": véu claro mais denso à esquerda, onde fica o texto */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/65 to-white/35 transition-opacity duration-300 group-hover:opacity-90"
      />
      <div className="absolute inset-0 flex min-w-0 flex-col justify-center gap-1.5 px-5 pr-14">
        <h3 className="break-anywhere line-clamp-2 text-balance font-display text-[1.35rem] font-normal leading-[1.15] text-text sm:text-2xl">
          {trip.destination}
        </h3>
        {showStars || range ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem] font-medium text-text-muted">
            {showStars ? <StarRating value={trip.rating} size={14} /> : null}
            {range ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden />
                {range}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
