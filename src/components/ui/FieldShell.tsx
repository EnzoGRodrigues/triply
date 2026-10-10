import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

/** Ids de acessibilidade derivados do id do campo. */
export function fieldIds(id: string) {
  return { errorId: `${id}-error`, hintId: `${id}-hint` };
}

export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  const { errorId, hintId } = fieldIds(id);
  const ids = [error ? errorId : null, hint ? hintId : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

interface FieldShellProps {
  id: string;
  label: string;
  hideLabel?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  /** Controles à direita (botão limpar, olho da senha…). */
  trailing?: ReactNode;
  /** Alinha o `trailing` ao topo (textarea). */
  trailingTop?: boolean;
  className?: string;
  children: ReactNode;
}

/** Casca visual do campo "filled" do Material 3: rótulo acima, base com linha inferior e erro/ajuda abaixo. */
export function FieldShell({
  id,
  label,
  hideLabel,
  error,
  hint,
  disabled,
  trailing,
  trailingTop,
  className,
  children,
}: FieldShellProps) {
  const { errorId, hintId } = fieldIds(id);
  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={id}
        className={cn("mb-1.5 block text-sm font-medium text-text", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <div
        className={cn(
          "relative flex rounded-t-[4px] border-b bg-field transition-[border-color,box-shadow,background-color] duration-150",
          trailingTop ? "items-start" : "items-center",
          error
            ? "border-danger shadow-[inset_0_-1px_0_var(--color-danger)]"
            : "border-field-line focus-within:border-primary focus-within:shadow-[inset_0_-1px_0_var(--color-primary)]",
          !disabled && "hover:bg-[#ddd6e2]",
          disabled && "opacity-60",
        )}
      >
        {children}
        {trailing ? (
          <div className={cn("flex shrink-0 items-center gap-0.5 pr-2", trailingTop && "pt-2")}>
            {trailing}
          </div>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 flex items-start gap-1 text-xs text-danger-text">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
