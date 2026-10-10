import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

interface BackLinkProps {
  href: string;
  label?: string;
  className?: string;
}

/** Seta "voltar" (azul-violeta, como no Figma) com rótulo. */
export function BackLink({ href, label = "Voltar", className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group -ml-2 inline-flex items-center gap-2 rounded-full py-1.5 pl-2 pr-4 text-primary transition-colors hover:bg-primary-faint",
        className,
      )}
    >
      <ArrowLeft className="size-5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
