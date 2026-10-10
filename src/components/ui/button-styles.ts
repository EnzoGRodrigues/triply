import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "danger-outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm shadow-primary/25 hover:bg-primary-hover hover:shadow-md hover:shadow-primary/30",
  secondary: "bg-primary-soft text-primary hover:bg-[#d8c9f6]",
  outline: "border border-line bg-surface text-primary hover:border-primary hover:bg-primary-faint",
  danger: "bg-danger text-white shadow-sm shadow-danger/25 hover:bg-danger-hover",
  "danger-outline": "border border-danger/40 bg-surface text-danger-text hover:border-danger hover:bg-danger-soft",
  ghost: "text-primary hover:bg-primary-faint",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3.5 text-sm",
  md: "h-11 gap-2 px-5 text-base",
  lg: "h-12 gap-2 px-8 text-lg",
};

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/** Classes dos botões — usadas por `Button` e `ButtonLink` para ficarem idênticos. */
export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center rounded-lg font-display font-normal whitespace-nowrap",
    "transition-[background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    variants[variant],
    sizes[size],
    fullWidth && "w-full",
    className,
  );
}
