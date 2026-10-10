import { CircleX } from "lucide-react";

interface FieldClearButtonProps {
  label: string;
  onClick: () => void;
}

/** Botão "limpar" (ícone CircleX) dos campos filled. */
export function FieldClearButton({ label, onClick }: FieldClearButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Limpar ${label.toLowerCase()}`}
      className="grid size-8 place-items-center rounded-full text-text-muted transition-colors hover:bg-black/5 hover:text-text"
    >
      <CircleX className="size-5" aria-hidden />
    </button>
  );
}
