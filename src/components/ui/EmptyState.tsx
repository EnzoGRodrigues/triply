import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  /** Botão/link de chamada para ação. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "animate-rise flex flex-col items-center rounded-card border border-dashed border-line bg-surface/60 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 grid size-16 place-items-center rounded-full bg-primary-soft text-primary [&_svg]:size-8">
        {icon}
      </div>
      <h2 className="font-display text-xl font-medium text-text">{title}</h2>
      {description ? <p className="break-anywhere mt-1.5 max-w-md text-balance text-text-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
