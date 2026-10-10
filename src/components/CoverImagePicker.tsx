"use client";

import { useRef, useState, type DragEvent } from "react";
import { ImageIcon, Paperclip, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { ImageProcessingError, resizeImageToDataUrl } from "@/lib/image";
import type { CoverImageSource, ImageInsight } from "@/types/api";
import { CoverImage } from "./CoverImage";
import { Button } from "./ui/Button";

/** Escolha atual da capa no formulário. */
export type CoverChoice =
  | { kind: "none" }
  /** Capa já salva na viagem (edição). */
  | { kind: "existing"; url: string }
  /** Imagem sugerida pelas APIs externas. */
  | { kind: "suggested"; url: string; source: CoverImageSource }
  /** Upload do usuário já redimensionado (data URL JPEG). */
  | { kind: "upload"; dataUrl: string; fileName: string };

/** "Wikipedia"/"Wikimedia Commons" → `wikipedia`; qualquer outro → `externa`. */
export function coverSourceFrom(insight: Pick<ImageInsight, "source">): CoverImageSource {
  return /wiki/i.test(insight.source) ? "wikipedia" : "externa";
}

interface CoverImagePickerProps {
  value: CoverChoice;
  suggestion: ImageInsight | null;
  onChange: (choice: CoverChoice) => void;
  className?: string;
}

function previewUrl(choice: CoverChoice): string | null {
  switch (choice.kind) {
    case "upload":
      return choice.dataUrl;
    case "existing":
    case "suggested":
      return choice.url;
    default:
      return null;
  }
}

function describe(choice: CoverChoice): string {
  switch (choice.kind) {
    case "upload":
      return choice.fileName;
    case "existing":
      return "Capa atual do plano";
    case "suggested":
      return "Imagem sugerida (Wikipedia)";
    default:
      return "Nenhuma imagem selecionada";
  }
}

/**
 * "Imagem – capa": enviar do computador (redimensionada no navegador para no máx. 1280 px,
 * JPEG ~0,8) ou usar a imagem sugerida pelas APIs externas.
 */
export function CoverImagePicker({ value, suggestion, onChange, className }: CoverImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const suggestionActive = value.kind === "suggested" && suggestion?.url === value.url;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      onChange({ kind: "upload", dataUrl, fileName: file.name });
    } catch (err) {
      setError(err instanceof ImageProcessingError ? err.message : "Não foi possível processar a imagem.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files[0]);
  }

  const url = previewUrl(value);

  return (
    <section
      aria-labelledby="cover-title"
      className={cn("rounded-2xl bg-surface p-5 shadow-card sm:p-6", className)}
    >
      <h2 id="cover-title" className="mb-3 font-display text-xl font-medium text-primary">
        Imagem – capa
      </h2>

      <div className="grid gap-5 md:grid-cols-[minmax(0,26rem)_1fr] md:items-center md:gap-8">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "relative overflow-hidden rounded-xl ring-2 ring-transparent transition-shadow",
            dragging && "ring-primary",
          )}
        >
          <CoverImage
            src={url}
            alt={url ? "Pré-visualização da capa" : ""}
            className="aspect-[16/9] w-full"
            eager
          />
          {!url ? (
            <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm font-medium text-primary/80">
              {dragging ? "Solte a imagem aqui" : "Sem capa — arraste uma imagem ou use os botões abaixo"}
            </p>
          ) : null}
        </div>

        <div>
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <ImageIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{describe(value)}</span>
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <Button
              variant="secondary"
              size="sm"
              loading={busy}
              icon={<Paperclip className="size-4" aria-hidden />}
              onClick={() => inputRef.current?.click()}
            >
              {value.kind === "upload" ? "Trocar imagem" : "Inserir imagem"}
            </Button>
            {suggestion && !suggestionActive ? (
              <Button
                variant="outline"
                size="sm"
                icon={<Sparkles className="size-4" aria-hidden />}
                onClick={() =>
                  onChange({ kind: "suggested", url: suggestion.url, source: coverSourceFrom(suggestion) })
                }
              >
                Usar imagem sugerida
              </Button>
            ) : null}
            {value.kind !== "none" ? (
              <Button
                variant="danger-outline"
                size="sm"
                icon={<Trash2 className="size-4" aria-hidden />}
                onClick={() => onChange({ kind: "none" })}
              >
                Remover
              </Button>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="mt-2 text-xs text-danger-text">
              {error}
            </p>
          ) : (
            <p className="mt-2 text-xs text-text-muted/85">
              JPG, PNG ou WebP. A imagem é reduzida para até 1280 px.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
