import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/server/auth/cookie";
import type { ApiError } from "@/types/api";

import type { ApiException } from "./errors";

/** Dados do usuário nunca devem ser guardados em cache de navegador/CDN. */
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" } as const;

export function json<T>(body: T, init: ResponseInit = {}): NextResponse<T> {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  return NextResponse.json(body, { ...init, headers });
}

export function created<T>(body: T): NextResponse<T> {
  return json(body, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204, headers: PRIVATE_HEADERS });
}

export function errorResponse(error: ApiException): NextResponse<ApiError> {
  const body: ApiError = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.fields && Object.keys(error.fields).length > 0
        ? { fields: error.fields }
        : {}),
    },
  };
  const response = json(body, { status: error.status, headers: error.headers });
  if (error.clearSession) clearSessionCookie(response);
  return response;
}
