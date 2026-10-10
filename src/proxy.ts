import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/server/auth/next-path";
import { SESSION_COOKIE, verifySessionToken } from "@/server/auth/token";

/** Áreas que exigem sessão (qualquer subcaminho). */
const PROTECTED_PREFIXES = ["/perfil", "/viagens", "/planos", "/registrar"];
/** Páginas públicas só para quem NÃO está logado. */
const GUEST_ONLY_PATHS = ["/login", "/cadastro"];

function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function redirectTo(request: NextRequest, pathname: string, search = "") {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token);
  const isLoggedIn = userId !== null;

  let response: NextResponse | undefined;

  if (pathname === "/") {
    response = redirectTo(request, isLoggedIn ? "/perfil" : "/login");
  } else if (GUEST_ONLY_PATHS.some((path) => isUnder(pathname, path))) {
    if (isLoggedIn) {
      response = redirectTo(request, "/perfil");
    } else {
      // `?next=` forjado (URL absoluta, "//host"...) é descartado antes de chegar ao front.
      const next = request.nextUrl.searchParams.get("next");
      if (next !== null && safeNextPath(next) === null) {
        const url = request.nextUrl.clone();
        url.searchParams.delete("next");
        response = NextResponse.redirect(url);
      }
    }
  } else if (PROTECTED_PREFIXES.some((prefix) => isUnder(pathname, prefix))) {
    if (!isLoggedIn) {
      const next = safeNextPath(pathname + search);
      response = redirectTo(
        request,
        "/login",
        next ? `?${new URLSearchParams({ next })}` : "",
      );
    }
  }

  response ??= NextResponse.next();

  // Cookie presente mas inválido/expirado: limpa para não ficar reenviando.
  if (token && !isLoggedIn) response.cookies.delete(SESSION_COOKIE);

  return response;
}

// Só roda onde há regra — fora /api, _next, arquivos estáticos, /sobre e /api-docs (públicos).
export const config = {
  matcher: [
    "/",
    "/login/:path*",
    "/cadastro/:path*",
    "/perfil/:path*",
    "/viagens/:path*",
    "/planos/:path*",
    "/registrar/:path*",
  ],
};
