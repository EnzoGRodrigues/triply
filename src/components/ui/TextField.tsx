"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { describedBy, FieldShell } from "./FieldShell";
import { FieldClearButton } from "./FieldClearButton";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "size"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  /** Mostra o botão "limpar" quando há valor (padrão: sim). */
  clearable?: boolean;
  onClear?: () => void;
  hideLabel?: boolean;
  /** Controles extras à direita, antes do "limpar". */
  trailing?: ReactNode;
  containerClassName?: string;
}

/** Campo de texto "filled" do Material 3 com rótulo, botão limpar e erro. */
export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  clearable = true,
  onClear,
  hideLabel,
  trailing,
  containerClassName,
  className,
  id: idProp,
  type = "text",
  disabled,
  readOnly,
  ...props
}: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  const showClear = clearable && value.length > 0 && !disabled && !readOnly;

  function clear() {
    if (onClear) onClear();
    else onChange("");
    document.getElementById(id)?.focus();
  }

  return (
    <FieldShell
      id={id}
      label={label}
      hideLabel={hideLabel}
      error={error}
      hint={hint}
      disabled={disabled}
      className={containerClassName}
      trailing={
        <>
          {trailing}
          {isPassword && value.length > 0 ? (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={revealed}
              className="grid size-8 place-items-center rounded-full text-text-muted transition-colors hover:bg-black/5 hover:text-text"
            >
              {revealed ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
            </button>
          ) : null}
          {showClear ? <FieldClearButton label={label} onClick={clear} /> : null}
        </>
      }
    >
      <input
        id={id}
        type={isPassword && revealed ? "text" : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(
          "h-[52px] min-w-0 flex-1 bg-transparent px-4 text-base text-text outline-none placeholder:text-placeholder disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
}
