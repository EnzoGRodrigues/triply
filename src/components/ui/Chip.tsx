import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ChipProps {
  children: ReactNode;
  icon?: ReactNode;
  /** Com `onClick` o chip vira um botão de alternar (`aria-pressed`). */
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

const base =
  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors duration-150 [&_svg]:size-4";

/** Etiqueta (companhia, transporte…) ou chip de escolha clicável. */
export function Chip({ children, icon, onClick, selected = false, className }: ChipProps) {
  if (!onClick) {
    return (
      <span className={cn(base, "bg-primary-soft text-primary", className)}>
        {icon}
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        base,
        "h-9 cursor-pointer border",
        selected
          ? "border-primary bg-primary text-white shadow-sm"
          : "border-line bg-surface text-text hover:border-primary hover:bg-primary-faint hover:text-primary",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}
