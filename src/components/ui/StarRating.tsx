"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

interface StarRatingProps {
  /** 0–5; `null` = sem avaliação. */
  value: number | null;
  /** Se informado, vira um campo de entrada (radiogroup); senão é só exibição. */
  onChange?: (value: number) => void;
  /** Tamanho dos ícones em px. */
  size?: number;
  label?: string;
  className?: string;
}

const STARS = [1, 2, 3, 4, 5] as const;

/** Estrelas de avaliação: exibição (somente leitura) ou entrada acessível (setas do teclado). */
export function StarRating({ value, onChange, size = 22, label = "Avaliação", className }: StarRatingProps) {
  const name = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const current = value ?? 0;

  if (!onChange) {
    return (
      <span
        role="img"
        aria-label={value ? `${value} de 5 estrelas` : "Sem avaliação"}
        className={cn("inline-flex items-center gap-0.5 text-primary", className)}
      >
        {STARS.map((n) => (
          <Star
            key={n}
            aria-hidden
            style={{ width: size, height: size }}
            className={cn(n <= current ? "fill-primary" : "fill-transparent")}
          />
        ))}
      </span>
    );
  }

  const shown = hovered ?? current;

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-1.5 text-sm font-medium text-text">{label}</legend>
      <div className="inline-flex items-center gap-1 text-primary" onMouseLeave={() => setHovered(null)}>
        {STARS.map((n) => (
          <label
            key={n}
            className="relative grid cursor-pointer place-items-center rounded-full p-1 transition-transform duration-150 hover:scale-110"
            onMouseEnter={() => setHovered(n)}
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={current === n}
              onChange={() => onChange(n)}
              aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
              className="peer sr-only"
            />
            <Star
              aria-hidden
              style={{ width: size, height: size }}
              className={cn(
                "transition-colors duration-150",
                n <= shown ? "fill-primary" : "fill-transparent",
              )}
            />
            <span className="pointer-events-none absolute inset-0 rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-primary" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
