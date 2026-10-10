import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Trip } from "@/types/api";
import { TripCardFace } from "./TripCardFace";

interface SelectableTripCardProps {
  trip: Trip;
  checked: boolean;
  onChange: (checked: boolean) => void;
  index?: number;
}

/** Cartão de viagem selecionável (checkbox à direita) usado em "Registrar viagem". */
export function SelectableTripCard({ trip, checked, onChange, index = 0 }: SelectableTripCardProps) {
  return (
    <label
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
      className={cn(
        "group relative block animate-rise cursor-pointer overflow-hidden rounded-card bg-surface shadow-card",
        "transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-card-hover",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-primary",
        checked && "ring-2 ring-primary ring-offset-2 ring-offset-bg",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={`Marcar ${trip.destination} como realizada`}
        className="peer sr-only"
      />
      <TripCardFace trip={trip} eager={index < 3} />
      <span
        aria-hidden
        className={cn(
          "absolute right-4 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md border-2 border-primary bg-white/90 text-white transition-all duration-200",
          checked && "scale-105 bg-primary",
        )}
      >
        <Check className={cn("size-[18px] transition-opacity", checked ? "opacity-100" : "opacity-0")} strokeWidth={3} />
      </span>
    </label>
  );
}
