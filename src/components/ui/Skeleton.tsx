import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Bloco "carregando" com brilho suave. Decorativo: agrupe em `role="status"` com texto para leitores de tela. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(110deg,#e4dcf3_30%,#f3eefb_50%,#e4dcf3_70%)] bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}
