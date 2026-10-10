"use client";

import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { describedBy, FieldShell } from "./FieldShell";
import { FieldClearButton } from "./FieldClearButton";

interface DateFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size"> {
  label: string;
  /** "YYYY-MM-DD" ou "" */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

/** Campo de data (seletor nativo, valor "YYYY-MM-DD") no estilo filled com botão limpar. */
export function DateField({
  label,
  value,
  onChange,
  error,
  hint,
  containerClassName,
  className,
  id: idProp,
  disabled,
  ...props
}: DateFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      hint={hint}
      disabled={disabled}
      className={containerClassName}
      trailing={
        value && !disabled ? (
          <FieldClearButton
            label={label}
            onClick={() => {
              onChange("");
              document.getElementById(id)?.focus();
            }}
          />
        ) : null
      }
    >
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(
          "date-input h-[52px] min-w-0 flex-1 bg-transparent px-4 text-base text-text outline-none disabled:cursor-not-allowed",
          !value && "text-placeholder",
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
}
