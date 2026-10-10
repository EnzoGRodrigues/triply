import { exampleInsights, exampleSearchResults, exampleTripRealizada, exampleUser } from "./examples";
import { nullableRef, ref, type JsonObject } from "./types";

/**
 * `components.schemas` — espelha `src/types/api.ts` (contrato front ↔ back) e as
 * regras de validação dos `schemas.ts` de `src/server`. O script `npm run docs:check`
 * confere os exemplos contra os schemas zod reais.
 */

const date = (description: string): JsonObject => ({
  type: "string",
  format: "date",
  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
  description,
});

const nullable = (schema: JsonObject): JsonObject => ({
  ...schema,
  type: [schema.type as string, "null"],
});

const timestamp = (description: string): JsonObject => ({
  type: "string",
  format: "date-time",
  description,
});

/* ───────────── campos de entrada da viagem (POST e PATCH) ───────────── */

const tripInputProperties: Record<string, JsonObject> = {
  destination: {
    type: "string",
    minLength: 1,
    maxLength: 160,
    description:
      'Nome exibido do destino — use o `label` de `GET /api/destinations/search`. Ex.: "Barra Grande - Piauí", "Tulum, México", "Espanha".',
    examples: ["Tulum, México"],
  },
  city: nullable({ type: "string", maxLength: 120, description: "Cidade. Texto vazio vira `null`.", examples: ["Tulum"] }),
  region: nullable({ type: "string", maxLength: 120, description: "Estado/região.", examples: ["Quintana Roo"] }),
  country: nullable({
    type: "string",
    maxLength: 120,
    description: "País em português. Se vazio e houver `countryCode`, o back preenche.",
    examples: ["México"],
  }),
  countryCode: nullable({
    type: "string",
    pattern: "^[A-Za-z]{2}$",
    description: "ISO 3166-1 alpha-2 (normalizado para maiúsculas).",
    examples: ["MX"],
  }),
  latitude: nullable({ type: "number", minimum: -90, maximum: 90, examples: [20.21173] }),
  longitude: nullable({ type: "number", minimum: -180, maximum: 180, examples: [-87.46325] }),
  startDate: nullable(date("Ida — `YYYY-MM-DD`.")),
  endDate: nullable(date("Volta — `YYYY-MM-DD`; deve ser igual ou posterior à ida.")),
  accommodation: nullable({ type: "string", maxLength: 200, description: "Hospedagem.", examples: ["Hostal Mulut Tulum"] }),
  activities: nullable({ type: "string", maxLength: 2000, description: "Atividades planejadas." }),
  transport: { ...ref("Transport"), description: "Padrão: `aviao`." },
  currencyCode: nullable({
    type: "string",
    pattern: "^[A-Za-z]{3}$",
    description: "Moeda local (ISO 4217, normalizada para maiúsculas). Se vazia, o back usa a moeda do país.",
    examples: ["MXN"],
  }),
  exchangeRate: nullable({
    type: "number",
    exclusiveMinimum: 0,
    maximum: 99999999,
    description: "Quantos R$ vale 1 unidade da moeda local. Se vazia, o back busca a cotação atual.",
    examples: [0.270836],
  }),
  tempMin: nullable({ type: "number", minimum: -90, maximum: 60, description: "Temperatura mínima média (°C).", examples: [26.3] }),
  tempMax: nullable({
    type: "number",
    minimum: -90,
    maximum: 60,
    description: "Temperatura máxima média (°C); deve ser ≥ `tempMin`.",
    examples: [30.5],
  }),
  coverImage: {
    type: ["string", "null"],
    maxLength: 2800000,
    description:
      "Capa da viagem:\n" +
      "- **data URL** `data:image/(png|jpeg|webp|gif);base64,…` → upload do usuário (até **2 MB** decodificado; o conteúdo é conferido pelos bytes iniciais);\n" +
      "- **URL https** → imagem externa;\n" +
      "- **`null`** → remove a capa;\n" +
      "- **omitido** → `PATCH` mantém a atual; `POST` busca uma imagem automaticamente (Wikipedia).",
    examples: ["https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Tulum_2.jpg/1280px-Tulum_2.jpg"],
  },
  coverImageSource: {
    description:
      "Origem da capa. Normalmente não precisa ser enviado: data URL → `upload`; URL https → `externa` (ou `wikipedia` se informado).",
    oneOf: [ref("CoverImageSource"), { type: "null" }],
  },
};

const tripReportProperties: Record<string, JsonObject> = {
  rating: nullable({
    type: "integer",
    minimum: 1,
    maximum: 5,
    description: "Avaliação de 1 a 5 estrelas.",
    examples: [4],
  }),
  companions: nullableRef("Companions", "Companhia de viagem."),
  expenses: nullable({
    type: "number",
    minimum: 0,
    maximum: 9999999999.99,
    description: "Gastos totais em R$.",
    examples: [16000.27],
  }),
  experience: nullable({ type: "string", maxLength: 5000, description: 'Relato — "Minha experiência".' }),
};

/* ───────────── componentes ───────────── */

export const schemas: Record<string, JsonObject> = {
  /* Enums */
  TripStatus: { type: "string", enum: ["planejada", "realizada"], description: "`planejada` → `realizada`." },
  Transport: { type: "string", enum: ["aviao", "carro", "onibus"], description: "Meio de transporte." },
  Companions: {
    type: "string",
    enum: ["sozinho", "casal", "familia", "amigos", "trabalho"],
    description: "Com quem a viagem foi feita.",
  },
  CoverImageSource: {
    type: "string",
    enum: ["upload", "wikipedia", "externa"],
    description: "`upload` (enviada pelo usuário), `wikipedia` (sugerida automaticamente) ou `externa` (URL informada).",
  },
  ApiErrorCode: {
    type: "string",
    enum: [
      "VALIDATION_ERROR",
      "UNAUTHORIZED",
      "INVALID_CREDENTIALS",
      "FORBIDDEN",
      "NOT_FOUND",
      "EMAIL_IN_USE",
      "TOO_MANY_REQUESTS",
      "EXTERNAL_API_ERROR",
      "INTERNAL_ERROR",
    ],
    description:
      "`VALIDATION_ERROR` → 400 · `UNAUTHORIZED` → 401 · `INVALID_CREDENTIALS` → 401 · `FORBIDDEN` → 403 · `NOT_FOUND` → 404 · `EMAIL_IN_USE` → 409 · `TOO_MANY_REQUESTS` → 429 · `INTERNAL_ERROR` → 500 · `EXTERNAL_API_ERROR` → 502",
  },

  /* Erro */
  ApiError: {
    type: "object",
    required: ["error"],
    description: "Formato único de todos os erros da API.",
    properties: {
      error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: ref("ApiErrorCode"),
          message: { type: "string", description: "Mensagem pronta para exibir ao usuário, em pt-BR." },
          fields: {
            type: "object",
            additionalProperties: { type: "string" },
            description:
              "Erros por campo (só em `VALIDATION_ERROR` e `EMAIL_IN_USE`). Chave = nome do campo do body/query; itens de lista usam `trips.0.id`.",
            examples: [{ email: "Informe um e-mail válido." }],
          },
        },
      },
    },
  },

  /* Auth */
  User: {
    type: "object",
    required: ["id", "name", "email", "createdAt"],
    description: "Usuário. O hash da senha nunca é retornado.",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      email: { type: "string", format: "email", description: "Sempre em minúsculas." },
      createdAt: timestamp("Criação da conta."),
    },
    examples: [exampleUser],
  },
  RegisterInput: {
    type: "object",
    required: ["name", "email", "password", "confirmPassword"],
    properties: {
      name: { type: "string", minLength: 2, maxLength: 100, examples: ["Enzo Rodrigues"] },
      email: {
        type: "string",
        format: "email",
        maxLength: 254,
        description: "Normalizado (`trim` + minúsculas): `Enzo@Triply.app` e `enzo@triply.app` são a mesma conta.",
        examples: ["enzo@triply.app"],
      },
      password: { type: "string", minLength: 6, maxLength: 72, format: "password", description: "6 a 72 caracteres.", examples: ["triply123"] },
      confirmPassword: { type: "string", format: "password", description: "Deve ser igual a `password`.", examples: ["triply123"] },
    },
  },
  LoginInput: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email", examples: ["enzo@triply.app"] },
      password: { type: "string", format: "password", examples: ["triply123"] },
    },
  },
  AuthResponse: {
    type: "object",
    required: ["user"],
    properties: { user: ref("User") },
  },

  /* Perfil */
  ProfileStats: {
    type: "object",
    required: ["cities", "countries", "completedTrips", "plannedTrips"],
    properties: {
      cities: { type: "integer", minimum: 0, description: "Cidades distintas entre as viagens realizadas." },
      countries: { type: "integer", minimum: 0, description: "Países distintos (`countryCode`) entre as viagens realizadas." },
      completedTrips: { type: "integer", minimum: 0 },
      plannedTrips: { type: "integer", minimum: 0 },
    },
  },
  ProfileResponse: {
    type: "object",
    required: ["user", "stats"],
    properties: { user: ref("User"), stats: ref("ProfileStats") },
  },

  /* Viagens */
  Trip: {
    type: "object",
    description: "Viagem (planejada ou realizada). Valores numéricos sempre como `number`; datas como `YYYY-MM-DD`.",
    required: [
      "id", "status", "destination", "city", "region", "country", "countryCode", "latitude", "longitude",
      "startDate", "endDate", "accommodation", "activities", "transport", "currencyCode", "exchangeRate",
      "exchangeRateAt", "tempMin", "tempMax", "coverImageUrl", "coverImageSource", "completedAt", "rating",
      "companions", "expenses", "experience", "createdAt", "updatedAt",
    ],
    properties: {
      id: { type: "string", format: "uuid" },
      status: ref("TripStatus"),
      destination: { type: "string", description: 'Nome exibido do destino, ex.: "Barra Grande - Piauí", "México", "Espanha".' },
      city: nullable({ type: "string" }),
      region: nullable({ type: "string" }),
      country: nullable({ type: "string" }),
      countryCode: nullable({ type: "string", description: "ISO 3166-1 alpha-2." }),
      latitude: nullable({ type: "number" }),
      longitude: nullable({ type: "number" }),
      startDate: nullable(date("Ida.")),
      endDate: nullable(date("Volta.")),
      accommodation: nullable({ type: "string" }),
      activities: nullable({ type: "string", description: "Atividades planejadas." }),
      transport: ref("Transport"),
      currencyCode: nullable({ type: "string", description: "Moeda local, ISO 4217." }),
      exchangeRate: nullable({ type: "number", description: "Quantos R$ vale 1 unidade da moeda local (snapshot salvo na viagem)." }),
      exchangeRateAt: { ...timestamp("Quando a cotação foi atualizada na fonte."), type: ["string", "null"] },
      tempMin: nullable({ type: "number", description: "Temperatura mínima média esperada (°C)." }),
      tempMax: nullable({ type: "number", description: "Temperatura máxima média esperada (°C)." }),
      coverImageUrl: nullable({
        type: "string",
        description:
          "URL pronta para `<img src>`; **nunca** é data URL. Upload → `/api/trips/{id}/cover?v=<updatedAt em ms>`; imagem externa → URL https absoluta.",
      }),
      coverImageSource: nullableRef("CoverImageSource"),
      completedAt: { ...timestamp("Quando foi marcada como realizada."), type: ["string", "null"] },
      rating: nullable({ type: "integer", minimum: 1, maximum: 5 }),
      companions: nullableRef("Companions"),
      expenses: nullable({ type: "number", description: "Gastos totais em R$." }),
      experience: nullable({ type: "string", description: '"Minha experiência".' }),
      createdAt: timestamp("Criação."),
      updatedAt: timestamp("Última atualização."),
    },
    examples: [exampleTripRealizada],
  },
  TripResponse: { type: "object", required: ["trip"], properties: { trip: ref("Trip") } },
  TripListResponse: {
    type: "object",
    required: ["trips"],
    properties: { trips: { type: "array", items: ref("Trip") } },
  },
  TripInput: {
    type: "object",
    description: "Corpo de `POST /api/trips` (cria uma viagem **planejada**). Só `destination` é obrigatório.",
    required: ["destination"],
    properties: tripInputProperties,
  },
  TripReportInput: {
    type: "object",
    description: "Relato de uma viagem realizada.",
    properties: tripReportProperties,
  },
  TripUpdateInput: {
    type: "object",
    description:
      "Corpo de `PATCH /api/trips/{id}`: qualquer subconjunto dos campos de `TripInput` e do relato. Campo omitido = mantém; `null` = limpa. O relato só vale para viagens `realizada`.",
    properties: { ...tripInputProperties, ...tripReportProperties },
  },
  CompleteTripsInput: {
    type: "object",
    required: ["trips"],
    properties: {
      trips: {
        type: "array",
        minItems: 1,
        maxItems: 50,
        uniqueItems: true,
        description: 'Viagens a marcar como realizadas, cada uma com seu relato. "Pular" o relato = enviar só o `id`.',
        items: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", format: "uuid" }, ...tripReportProperties },
        },
      },
    },
  },

  /* Destinos / APIs externas */
  DestinationResult: {
    type: "object",
    required: ["id", "name", "region", "country", "countryCode", "latitude", "longitude", "label"],
    properties: {
      id: { type: "string", description: "Identificador do lugar no Open-Meteo Geocoding." },
      name: { type: "string", description: 'Nome da cidade/local, ex.: "Barra Grande".' },
      region: nullable({ type: "string", description: 'Estado/região, ex.: "Piauí".' }),
      country: nullable({ type: "string", description: "País em português." }),
      countryCode: nullable({ type: "string", description: "ISO 3166-1 alpha-2." }),
      latitude: { type: "number" },
      longitude: { type: "number" },
      label: {
        type: "string",
        description:
          'Rótulo pronto para exibir e usar como `destination`: Brasil → "Barra Grande - Piauí"; exterior → "Tulum, México"; país → "México".',
      },
    },
  },
  DestinationSearchResponse: {
    type: "object",
    required: ["results"],
    properties: { results: { type: "array", items: ref("DestinationResult"), maxItems: 8 } },
    examples: [{ results: exampleSearchResults }],
  },
  CountryInsight: {
    type: "object",
    required: ["code", "name", "flagUrl"],
    properties: {
      code: { type: "string" },
      name: { type: "string", description: "Nome em português." },
      flagUrl: nullable({ type: "string", description: "Bandeira (flagcdn.com)." }),
    },
  },
  CurrencyInsight: {
    type: "object",
    required: ["code", "name", "symbol", "rateToBRL", "label", "updatedAt", "source", "sourceUrl"],
    properties: {
      code: { type: "string", description: "ISO 4217." },
      name: nullable({ type: "string", description: 'Ex.: "Peso mexicano".' }),
      symbol: nullable({ type: "string" }),
      rateToBRL: { type: "number", description: "Quantos R$ vale 1 unidade da moeda. Para BRL, `1`." },
      label: { type: "string", description: 'Ex.: "1 MXN = R$ 0,27"; "R$ 1,00" quando a moeda é BRL.' },
      updatedAt: timestamp("Atualização da cotação na fonte."),
      source: { type: "string", description: 'Provedor exibido na UI: "AwesomeAPI", "ExchangeRate-API" ou "Frankfurter (BCE)".' },
      sourceUrl: nullable({ type: "string", description: "Link de atribuição (obrigatório exibir para a ExchangeRate-API)." }),
    },
  },
  ClimateInsight: {
    type: "object",
    required: ["min", "max", "label", "source"],
    properties: {
      min: { type: "number", description: "Média das mínimas diárias no período (°C)." },
      max: { type: "number", description: "Média das máximas diárias no período (°C)." },
      label: { type: "string", description: 'Ex.: "≈ 20 °C" ou "≈ 25 a 30 °C".' },
      source: {
        type: "string",
        enum: ["previsao", "historico"],
        description: "`previsao` = Open-Meteo Forecast (até 16 dias); `historico` = Open-Meteo Archive (mesmas datas de um ano anterior).",
      },
    },
  },
  ImageInsight: {
    type: "object",
    required: ["url", "source", "attribution", "license", "pageUrl"],
    properties: {
      url: { type: "string", format: "uri", description: "Imagem de ~1280 px." },
      source: { type: "string", examples: ["Wikipedia"] },
      attribution: nullable({ type: "string", description: "Autor da imagem (Wikimedia Commons)." }),
      license: nullable({ type: "string", description: 'Licença, ex.: "CC BY-SA 4.0".' }),
      pageUrl: nullable({ type: "string", description: "Página da imagem (link de atribuição)." }),
    },
  },
  DestinationInsightsResponse: {
    type: "object",
    required: ["country", "currency", "climate", "image"],
    description: "Cada bloco falha de forma independente: se uma API externa estiver fora do ar, aquele bloco vem `null` e a resposta continua `200`.",
    properties: {
      country: nullableRef("CountryInsight"),
      currency: nullableRef("CurrencyInsight"),
      climate: nullableRef("ClimateInsight"),
      image: nullableRef("ImageInsight"),
    },
    examples: [exampleInsights],
  },
};
