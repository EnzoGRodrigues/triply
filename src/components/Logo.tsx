import { cn } from "@/lib/cn";

interface LogoProps {
  /** `white` para fundos na cor primária. */
  tone?: "primary" | "white";
  className?: string;
}

/** Marca "Triply": pequeno traçado de rota + wordmark em Lexend. */
export function Logo({ tone = "primary", className }: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-display font-normal tracking-tight",
        tone === "primary" ? "text-primary" : "text-white",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" fill="none" aria-hidden className="size-[0.95em] shrink-0">
        <path
          d="M6 24c0-7 5-6 7-10s0-8 6-8 7 6 7 6"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray="0.1 5.2"
        />
        <circle cx="7" cy="25" r="3.4" fill="currentColor" />
        <circle cx="26" cy="12" r="4.6" fill="currentColor" />
        <circle cx="26" cy="12" r="1.7" fill={tone === "primary" ? "#fff" : "#3300ff"} />
      </svg>
      Triply
    </span>
  );
}
