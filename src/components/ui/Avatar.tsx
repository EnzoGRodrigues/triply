import { UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

interface AvatarProps {
  size?: "sm" | "xl";
  className?: string;
}

/** Avatar padrão: círculo com o ícone de usuário na cor primária (como no Figma). */
export function Avatar({ size = "sm", className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        size === "sm" && "size-9 bg-primary-soft text-primary",
        size === "xl" && "size-28 bg-white text-primary shadow-card sm:size-32",
        className,
      )}
    >
      <UserRound
        className={size === "xl" ? "size-16 sm:size-20" : "size-5"}
        strokeWidth={size === "xl" ? 1.6 : 2}
      />
    </span>
  );
}
