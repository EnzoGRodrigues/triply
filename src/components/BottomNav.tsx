"use client";

import { Suspense } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { isActive, NAV_ITEMS } from "./nav-items";
import { WithPathname } from "./WithPathname";

/** Barra de navegação inferior (somente celular). */
export function BottomNav() {
  return (
    <Suspense fallback={<BottomNavBar pathname="" />}>
      <WithPathname>{(pathname) => <BottomNavBar pathname={pathname} />}</WithPathname>
    </Suspense>
  );
}

function BottomNavBar({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-white/96 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgb(29_27_32/0.06)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="group flex flex-col items-center gap-1 px-2 pb-2 pt-2.5 text-[0.7rem] font-medium"
              >
                <span
                  className={cn(
                    "grid h-8 w-14 place-items-center rounded-full transition-colors duration-200",
                    active ? "bg-primary-soft text-primary" : "text-text-muted group-active:bg-primary-faint",
                  )}
                >
                  <Icon className="size-[22px]" aria-hidden />
                </span>
                <span className={active ? "text-primary" : "text-text-muted"}>{item.shortLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
