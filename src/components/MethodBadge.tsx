import { cn } from "@/lib/cn";
import type { HttpMethod } from "@/lib/about-data";

const STYLES: Record<HttpMethod, string> = {
  GET: "bg-primary-soft text-primary",
  POST: "bg-primary text-white",
  PATCH: "bg-[#ffecc7] text-[#7a4b00]",
  DELETE: "bg-danger-soft text-danger-text",
};

/** Selo colorido do método HTTP. */
export function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-[3.75rem] items-center justify-center rounded-md px-2 font-mono text-[0.7rem] font-bold tracking-wide",
        STYLES[method],
      )}
    >
      {method}
    </span>
  );
}
