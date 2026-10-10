import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Não foi possível carregar",
  message = "Algo deu errado. Tente novamente.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-card border border-danger/25 bg-danger-soft/60 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="mb-3 grid size-14 place-items-center rounded-full bg-danger/10 text-danger">
        <TriangleAlert className="size-7" aria-hidden />
      </div>
      <h2 className="font-display text-lg font-medium text-text">{title}</h2>
      <p className="mt-1 max-w-md text-text-muted">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
