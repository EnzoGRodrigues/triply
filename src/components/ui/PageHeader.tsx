import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Ações alinhadas à direita (ex.: "Nova viagem"). */
  actions?: ReactNode;
  className?: string;
}

/** Título de página: Lexend, cor primária. */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        <h1 className="break-anywhere font-display text-[1.75rem] font-normal leading-tight text-primary sm:text-3xl lg:text-[2rem]">
          {title}
        </h1>
        {subtitle ? <p className="break-anywhere mt-1 text-text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
