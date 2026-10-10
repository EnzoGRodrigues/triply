import Link from "next/link";
import { cn } from "@/lib/cn";
import { isActive, NAV_ITEMS } from "./nav-items";

/** Links da navbar (desktop). Sem `pathname` nenhum item aparece como ativo (fallback do Suspense). */
export function DesktopNavLinks({ pathname = "" }: { pathname?: string }) {
  return (
    <nav aria-label="Principal" className="ml-4 hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
              active ? "bg-primary-soft text-primary" : "text-text-muted hover:bg-primary-faint hover:text-primary",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
