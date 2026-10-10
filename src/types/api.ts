/**
 * Contrato da API REST do Triply (front <-> back).
 *
 * Fonte única de verdade para os formatos de request/response.
 * Mudou algo aqui? Avise o orquestrador — front e back dependem deste arquivo.
 *
 * Convenções:
 * - Datas de calendário: "YYYY-MM-DD" (ex.: ida/volta).
 * - Timestamps: ISO 8601 (ex.: "2026-10-09T21:00:00.000Z").
 * - Valores numéricos sempre como `number` (nunca string), mesmo os NUMERIC do Postgres.
 * - Valores monetários em reais (BRL).
 */

/* ───────────────────────────── Enums ───────────────────────────── */

export type TripStatus = "planejada" | "realizada";
export type Transport = "aviao" | "carro" | "onibus";
export type Companions = "sozinho" | "casal" | "familia" | "amigos" | "trabalho";
export type CoverImageSource = "upload" | "wikipedia" | "externa";

/* ───────────────────────────── Erros ───────────────────────────── */

export type ApiErrorCode =
  | "VALIDATION_ERROR" // 400
  | "UNAUTHORIZED" // 401
  | "INVALID_CREDENTIALS" // 401
  | "FORBIDDEN" // 403
  | "NOT_FOUND" // 404
  | "EMAIL_IN_USE" // 409
  | "TOO_MANY_REQUESTS" // 429
  | "EXTERNAL_API_ERROR" // 502
  | "INTERNAL_ERROR"; // 500

export interface ApiError {
  error: {
    code: ApiErrorCode;
    /** Mensagem pronta para exibir ao usuário, em pt-BR. */
    message: string;
    /** Erros por campo (chave = nome do campo no body). */
    fields?: Record<string, string>;
  };
}

/* ───────────────────────────── Auth ───────────────────────────── */

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

/** POST /api/auth/register → 201 AuthResponse (+ cookie de sessão) */
export interface RegisterInput {
  name: string;
  email: string;
  password: string; // mínimo 6 caracteres
  confirmPassword: string;
}

/** POST /api/auth/login → 200 AuthResponse (+ cookie de sessão) */
export interface LoginInput {
  email: string;
  password: string;
}

/** Resposta de register, login e GET /api/auth/me */
export interface AuthResponse {
  user: User;
}

/* ───────────────────────────── Perfil ───────────────────────────── */

export interface ProfileStats {
  /** Cidades distintas entre as viagens realizadas. */
  cities: number;
  /** Países distintos (countryCode) entre as viagens realizadas. */
  countries: number;
  completedTrips: number;
  plannedTrips: number;
}

/** GET /api/profile */
export interface ProfileResponse {
  user: User;
  stats: ProfileStats;
}

/* ───────────────────────────── Viagens ───────────────────────────── */

export interface Trip {
  id: string;
  status: TripStatus;

  /** Nome exibido do destino, ex.: "Barra Grande - Piauí", "México", "Espanha". */
  destination: string;
  city: string | null;
  region: string | null;
  country: string | null;
  /** ISO 3166-1 alpha-2, ex.: "BR", "MX". */
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;

  /** Ida — "YYYY-MM-DD" */
  startDate: string | null;
  /** Volta — "YYYY-MM-DD" */
  endDate: string | null;

  /** Hospedagem */
  accommodation: string | null;
  /** Atividades planejadas */
  activities: string | null;
  transport: Transport;

  /** Moeda local do destino, ISO 4217 (ex.: "MXN", "EUR", "BRL"). */
  currencyCode: string | null;
  /** Quantos R$ vale 1 unidade da moeda local (ex.: 0.29 para MXN). Snapshot salvo na viagem. */
  exchangeRate: number | null;
  exchangeRateAt: string | null;

  /** Temperatura média esperada no período (°C). */
  tempMin: number | null;
  tempMax: number | null;

  /**
   * URL pronta para usar em <img src>. Nunca é um data URL:
   * - imagem enviada pelo usuário → "/api/trips/{id}/cover?v=<updatedAt>"
   * - imagem externa (ex.: Wikipedia) → URL https absoluta
   */
  coverImageUrl: string | null;
  coverImageSource: CoverImageSource | null;

  /* Relato — preenchido quando a viagem é marcada como realizada */
  completedAt: string | null;
  /** 1 a 5 estrelas */
  rating: number | null;
  companions: Companions | null;
  /** Gastos totais em R$ */
  expenses: number | null;
  /** "Minha experiência" */
  experience: string | null;

  createdAt: string;
  updatedAt: string;
}

/** GET /api/trips?status=planejada|realizada → TripListResponse */
export interface TripListResponse {
  trips: Trip[];
}

/** GET /api/trips/{id}, POST /api/trips, PATCH /api/trips/{id} → TripResponse */
export interface TripResponse {
  trip: Trip;
}

/** Body de POST /api/trips (cria viagem planejada). */
export interface TripInput {
  destination: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  accommodation?: string | null;
  activities?: string | null;
  transport?: Transport;
  currencyCode?: string | null;
  exchangeRate?: number | null;
  tempMin?: number | null;
  tempMax?: number | null;
  /**
   * - data URL ("data:image/jpeg;base64,...") → upload do usuário (máx. ~2 MB)
   * - URL https → imagem externa
   * - null → remove a capa
   * - omitido → mantém como está (PATCH) / backend tenta buscar uma imagem automática (POST)
   */
  coverImage?: string | null;
  coverImageSource?: CoverImageSource | null;
}

/** Relato de uma viagem realizada. */
export interface TripReportInput {
  rating?: number | null;
  companions?: Companions | null;
  expenses?: number | null;
  experience?: string | null;
}

/** Body de PATCH /api/trips/{id} — qualquer subconjunto dos campos. */
export type TripUpdateInput = Partial<TripInput> & TripReportInput;

/** POST /api/trips/complete → TripListResponse (as viagens atualizadas) */
export interface CompleteTripsInput {
  trips: Array<{ id: string } & TripReportInput>;
}

/* ───────────────────────── Destinos (APIs externas) ───────────────────────── */

export interface DestinationResult {
  id: string;
  /** Nome da cidade/local, ex.: "Barra Grande" */
  name: string;
  /** Estado/região, ex.: "Piauí" */
  region: string | null;
  country: string | null;
  countryCode: string | null;
  latitude: number;
  longitude: number;
  /**
   * Rótulo pronto para exibir e usar como `destination` da viagem:
   * - Brasil → "Barra Grande - Piauí" (cidade - estado)
   * - exterior → "Tulum, México" (cidade, país)
   * - quando o resultado é o próprio país → "México"
   */
  label: string;
}

/** GET /api/destinations/search?q=texto → DestinationSearchResponse */
export interface DestinationSearchResponse {
  results: DestinationResult[];
}

export interface CountryInsight {
  code: string;
  /** Nome em português, ex.: "México" */
  name: string;
  flagUrl: string | null;
}

export interface CurrencyInsight {
  code: string;
  name: string | null;
  symbol: string | null;
  /** Quantos R$ vale 1 unidade da moeda. */
  rateToBRL: number;
  /** Ex.: "1 MXN = R$ 0,29" ou "R$ 1,00" quando a moeda for BRL. */
  label: string;
  updatedAt: string;
  /** Nome do provedor exibido na UI, ex.: "AwesomeAPI", "ExchangeRate-API", "Frankfurter". */
  source: string;
  /** Link do provedor (atribuição obrigatória no caso da ExchangeRate-API). */
  sourceUrl: string | null;
}

export interface ClimateInsight {
  min: number;
  max: number;
  /** Ex.: "≈ 20 °C" ou "≈ 25 a 30 °C" */
  label: string;
  /** previsao = forecast (até ~16 dias); historico = mesmas datas no ano anterior */
  source: "previsao" | "historico";
}

export interface ImageInsight {
  url: string;
  /** Ex.: "Wikipedia" */
  source: string;
  /** Autor da imagem, quando conhecido. */
  attribution: string | null;
  /** Licença, ex.: "CC BY-SA 4.0". */
  license: string | null;
  /** Página da imagem/artigo (link de atribuição). */
  pageUrl: string | null;
}

/**
 * GET /api/destinations/insights?name=&countryCode=&lat=&lon=&start=&end=
 * Cada bloco falha de forma independente (vira null) — a rota nunca derruba tudo por causa de uma API externa.
 */
export interface DestinationInsightsResponse {
  country: CountryInsight | null;
  currency: CurrencyInsight | null;
  climate: ClimateInsight | null;
  image: ImageInsight | null;
}
