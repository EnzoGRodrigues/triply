"use client";

import { useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { describedBy, FieldShell } from "./FieldShell";
import { FieldClearButton } from "./FieldClearButton";

interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  clearable?: boolean;
  hideLabel?: boolean;
  containerClassName?: string;
}

/** Área de texto "filled" do Material 3 (mesma casca do `TextField`). */
export function Textarea({
  label,
  value,
  onChange,
  error,
  hint,
  clearable = true,
  hideLabel,
  containerClassName,
  className,
  id: idProp,
  rows = 3,
  disabled,
  readOnly,
  ...props
}: TextareaProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const showClear = clearable && value.length > 0 && !disabled && !readOnly;

  return (
    <FieldShell
      id={id}
      label={label}
      hideLabel={hideLabel}
      error={error}
      hint={hint}
      disabled={disabled}
      className={containerClassName}
      trailingTop
      trailing={
        showClear ? (
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
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(
          "min-h-[84px] min-w-0 flex-1 resize-y bg-transparent px-4 py-3.5 text-base leading-snug text-text outline-none placeholder:text-placeholder disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
}
