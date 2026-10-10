import { Globe, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";

interface StatsCardProps {
  cities: number;
  countries: number;
  className?: string;
}

/** Card de estatísticas do perfil (fundo primário): cidades e países visitados. */
export function StatsCard({ cities, countries, className }: StatsCardProps) {
  const items = [
    { icon: MapPin, value: cities, label: cities === 1 ? "Cidade" : "Cidades" },
    { icon: Globe, value: countries, label: countries === 1 ? "País" : "Países" },
  ];

  return (
    <div
      role="group"
      aria-label="Estatísticas de viagens"
      className={cn(
        "relative grid grid-cols-2 overflow-hidden rounded-2xl bg-primary text-white shadow-lg shadow-primary/25",
        className,
      )}
    >
      {items.map(({ icon: Icon, value, label }, i) => (
        <div
          key={label}
          className={cn(
            "relative flex flex-col items-center gap-1 px-8 py-5",
            i === 0 && "border-r border-white/20",
          )}
        >
          <Icon className="size-7" aria-hidden />
          <span className="font-display text-3xl font-medium leading-none tabular-nums">{value}</span>
          <span className="text-sm text-white/85">{label}</span>
        </div>
      ))}
    </div>
  );
}
