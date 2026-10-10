"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { DesktopNavLinks } from "./DesktopNavLinks";
import { Logo } from "./Logo";
import { LogoutButton } from "./LogoutButton";
import { WithPathname } from "./WithPathname";
import { Avatar } from "./ui/Avatar";
import { Skeleton } from "./ui/Skeleton";

/** Navbar do topo: logo, links (desktop), usuário e sair. No celular só logo + sair (links na barra inferior). */
export function Navbar() {
  const { user, loading } = useCurrentUser();
  const firstName = user?.name.split(" ")[0];

  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-white/95 shadow-nav backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/perfil" aria-label="Triply — ir para o perfil" className="text-[1.7rem] leading-none">
          <Logo />
        </Link>

        <Suspense fallback={<DesktopNavLinks />}>
          <WithPathname>{(pathname) => <DesktopNavLinks pathname={pathname} />}</WithPathname>
        </Suspense>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="hidden items-center gap-2.5 sm:flex" aria-live="polite">
            <Avatar />
            {loading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span className="max-w-40 truncate text-sm font-medium text-text" title={user?.name}>
                {firstName}
              </span>
            )}
          </div>
          <LogoutButton className="max-md:hidden" />
          <LogoutButton iconOnly className="md:hidden" />
        </div>
      </div>
    </header>
  );
}
