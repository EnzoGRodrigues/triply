/**
 * Cliente tipado da API REST do Triply (contrato em `@/types/api`).
 * Somente fetch same-origin em `/api/*`. Erros viram `ApiClientError`.
 */
import type {
  ApiError,
  ApiErrorCode,
  AuthResponse,
  CompleteTripsInput,
  DestinationInsightsResponse,
  DestinationSearchResponse,
  LoginInput,
  ProfileResponse,
  RegisterInput,
  TripInput,
  TripListResponse,
  TripResponse,
  TripStatus,
  TripUpdateInput,
} from "@/types/api";
import { hardNavigate } from "@/lib/navigation";

export type ClientErrorCode = ApiErrorCode | "NETWORK_ERROR";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ClientErrorCode;
  readonly fields?: Record<string, string>;

  constructor(
    status: number,
    code: ClientErrorCode,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  /** Sessão ausente/expirada — o cliente já está redirecionando para /login. */
  get isAuthRedirect(): boolean {
    return this.code === "UNAUTHORIZED";
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Mensagem pronta para o usuário a partir de qualquer erro. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return "Algo deu errado. Tente novamente.";
}

/** Erros por campo (`VALIDATION_ERROR`), ou objeto vazio. */
export function getFieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiClientError ? (error.fields ?? {}) : {};
}

const AUTH_PATHS = ["/login", "/cadastro"];

let redirectingToLogin = false;

/**
 * Sessão inválida (ausente, expirada ou de um usuário que não existe mais).
 * Limpa o cookie antes de ir ao /login: sem isso o proxy, que só confere a assinatura do JWT,
 * devolveria o usuário para /perfil e a página entraria em loop de redirecionamento.
 */
async function redirectToLogin(): Promise<void> {
  if (typeof window === "undefined" || redirectingToLogin) return;
  const { pathname, search } = window.location;
  if (AUTH_PATHS.includes(pathname)) return;
  redirectingToLogin = true;
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } catch {
    // Mesmo sem conseguir limpar o cookie, segue para o login.
  }
  hardNavigate(`/login?next=${encodeURIComponent(pathname + search)}`);
}

type Query = Record<string, string | number | null | undefined>;

interface RequestOptions {
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  /** Permite cache HTTP do navegador (rotas de consulta externa). */
  cacheable?: boolean;
}

function buildUrl(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  { body, query, signal, cacheable }: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      credentials: "same-origin",
      cache: cacheable ? "default" : "no-store",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiClientError(
      0,
      "NETWORK_ERROR",
      "Sem conexão com o servidor. Verifique sua internet e tente de novo.",
    );
  }

  if (response.ok) {
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  let payload: Partial<ApiError> | null = null;
  try {
    payload = (await response.json()) as Partial<ApiError>;
  } catch {
    payload = null;
  }

  const code = payload?.error?.code ?? (response.status === 401 ? "UNAUTHORIZED" : "INTERNAL_ERROR");
  const message =
    payload?.error?.message ??
    (response.status === 401 ? "Sua sessão expirou. Entre novamente." : "Algo deu errado. Tente novamente.");

  if (response.status === 401 && code === "UNAUTHORIZED") void redirectToLogin();

  throw new ApiClientError(response.status, code, message, payload?.error?.fields);
}

/* ───────────────────────────── Auth ───────────────────────────── */

export const register = (input: RegisterInput) =>
  request<AuthResponse>("POST", "/api/auth/register", { body: input });

export const login = (input: LoginInput) =>
  request<AuthResponse>("POST", "/api/auth/login", { body: input });

export const logout = () => request<void>("POST", "/api/auth/logout");

export const getMe = (signal?: AbortSignal) =>
  request<AuthResponse>("GET", "/api/auth/me", { signal });

/* ───────────────────────────── Perfil ───────────────────────────── */

export const getProfile = (signal?: AbortSignal) =>
  request<ProfileResponse>("GET", "/api/profile", { signal });

/* ───────────────────────────── Viagens ───────────────────────────── */

export const listTrips = (status?: TripStatus, signal?: AbortSignal) =>
  request<TripListResponse>("GET", "/api/trips", { query: { status }, signal });

export const getTrip = (id: string, signal?: AbortSignal) =>
  request<TripResponse>("GET", `/api/trips/${encodeURIComponent(id)}`, { signal });

export const createTrip = (input: TripInput) =>
  request<TripResponse>("POST", "/api/trips", { body: input });

export const updateTrip = (id: string, input: TripUpdateInput) =>
  request<TripResponse>("PATCH", `/api/trips/${encodeURIComponent(id)}`, { body: input });

export const deleteTrip = (id: string) =>
  request<void>("DELETE", `/api/trips/${encodeURIComponent(id)}`);

export const completeTrips = (input: CompleteTripsInput) =>
  request<TripListResponse>("POST", "/api/trips/complete", { body: input });

/* ─────────────────────────── Destinos (APIs externas) ─────────────────────────── */

export const searchDestinations = (q: string, signal?: AbortSignal) =>
  request<DestinationSearchResponse>("GET", "/api/destinations/search", {
    query: { q },
    signal,
    cacheable: true,
  });

export interface InsightsParams {
  name: string;
  countryCode?: string | null;
  lat?: number | null;
  lon?: number | null;
  start?: string | null;
  end?: string | null;
}

export const getDestinationInsights = (params: InsightsParams, signal?: AbortSignal) =>
  request<DestinationInsightsResponse>("GET", "/api/destinations/insights", {
    query: {
      name: params.name,
      countryCode: params.countryCode,
      lat: params.lat,
      lon: params.lon,
      start: params.start,
      end: params.end,
    },
    signal,
    cacheable: true,
  });
