"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { describedBy, FieldShell } from "./FieldShell";
import { FieldClearButton } from "./FieldClearButton";

interface MoneyFieldProps {
  label: string;
  /** Valor em reais (ex.: 16000.27) ou `null` quando vazio. */
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  hint?: string;
  id?: string;
  disabled?: boolean;
  containerClassName?: string;
}

const MAX_DIGITS = 12;

/** Campo monetário em R$ com máscara: digitar `1600027` vira "R$ 16.000,27". */
export function MoneyField({
  label,
  value,
  onChange,
  error,
  hint,
  id: idProp,
  disabled,
  containerClassName,
}: MoneyFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, MAX_DIGITS);
    onChange(digits ? Number(digits) / 100 : null);
  }

  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      hint={hint}
      disabled={disabled}
      className={containerClassName}
      trailing={
        value !== null && !disabled ? (
          <FieldClearButton
            label={label}
            onClick={() => {
              onChange(null);
              document.getElementById(id)?.focus();
            }}
          />
        ) : null
      }
    >
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="R$ 0,00"
        value={value === null ? "" : formatBRL(value)}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(
          "h-[52px] min-w-0 flex-1 bg-transparent px-4 text-base text-text outline-none placeholder:text-placeholder disabled:cursor-not-allowed",
        )}
      />
    </FieldShell>
  );
}
