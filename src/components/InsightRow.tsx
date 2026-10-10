import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface InsightRowProps {
  icon: ReactNode;
  label: string;
  /** `null` mostra "Indisponível". */
  value: ReactNode | null;
  /** Linha de apoio abaixo do valor. */
  detail?: ReactNode;
  /** Fonte do dado (API externa) — é o que a apresentação destaca. */
  source?: ReactNode;
}

/** Linha do painel "Sobre o destino": rótulo, valor, detalhe e fonte. */
export function InsightRow({ icon, label, value, detail, source }: InsightRowProps) {
  const unavailable = value === null;
  return (
    <div className="flex gap-3.5">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary [&_svg]:size-[18px]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-sm font-medium text-text-muted">{label}</dt>
        <dd className={cn("break-anywhere mt-0.5 font-display text-lg leading-snug", unavailable ? "text-text-muted" : "text-text")}>
          {unavailable ? "Indisponível" : value}
        </dd>
        {!unavailable && detail ? <dd className="text-sm text-text-muted">{detail}</dd> : null}
        {!unavailable && source ? (
          <dd className="mt-1 text-xs text-text-muted/85">
            <span className="font-medium">Fonte:</span> {source}
          </dd>
        ) : null}
      </div>
    </div>
  );
}
