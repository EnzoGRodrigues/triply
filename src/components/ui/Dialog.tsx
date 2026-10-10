"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Barra de ações fixa na base. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Quando `false`, Esc, clique fora e o "X" são ignorados (ex.: durante um envio). */
  dismissible?: boolean;
}

const sizes = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" } as const;

/**
 * Diálogo modal acessível baseado no `<dialog>` nativo:
 * foco preso, Esc, fundo inerte e `aria-modal` vêm do navegador.
 * No celular vira uma "bottom sheet".
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
    // Ao ocultar a rota (Activity) ou desmontar, garante que o modal feche.
    return () => {
      if (el.open) el.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-none rounded-2xl bg-surface p-0 text-text shadow-2xl",
        "backdrop:bg-[#1d1b20]/55 backdrop:backdrop-blur-[2px] open:animate-dialog-in backdrop:animate-backdrop-in",
        "max-sm:mb-0 max-sm:w-full max-sm:rounded-b-none",
        sizes[size],
      )}
    >
      {open ? (
        <div className="relative flex max-h-[calc(100dvh-2rem)] flex-col sm:max-h-[calc(100dvh-4rem)]">
          <header className="px-6 pb-2 pt-6 pr-16">
            <h2 id={titleId} className="break-anywhere font-display text-xl font-medium text-primary">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="break-anywhere mt-1 text-sm text-text-muted">
                {description}
              </p>
            ) : null}
          </header>
          <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-3">{children}</div>
          {footer ? (
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line/60 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </footer>
          ) : null}
          {/* Último no DOM: o foco inicial cai no conteúdo, não no "X". */}
          <button
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            aria-label="Fechar"
            className="absolute right-3 top-3 grid size-10 place-items-center rounded-full text-text-muted transition-colors hover:bg-black/5 hover:text-text disabled:opacity-40"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      ) : null}
    </dialog>
  );
}
