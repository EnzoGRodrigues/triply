/** Conteúdo da página pública /sobre (espelha docs/API.md e SPEC §5–§6). */

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface EndpointInfo {
  method: HttpMethod;
  path: string;
  description: string;
  /** Exige sessão (cookie `triply_session`)? */
  auth: boolean;
}

export const ENDPOINTS: EndpointInfo[] = [
  {
    method: "POST",
    path: "/api/auth/register",
    description: "Cria a conta e já abre a sessão.",
    auth: false,
  },
  {
    method: "POST",
    path: "/api/auth/login",
    description: "Autentica e grava o cookie de sessão (JWT).",
    auth: false,
  },
  { method: "POST", path: "/api/auth/logout", description: "Encerra a sessão e limpa o cookie.", auth: true },
  { method: "GET", path: "/api/auth/me", description: "Usuário logado.", auth: true },
  {
    method: "GET",
    path: "/api/profile",
    description: "Usuário + estatísticas (cidades e países visitados).",
    auth: true,
  },
  {
    method: "GET",
    path: "/api/trips?status=",
    description: "Lista viagens planejadas ou realizadas.",
    auth: true,
  },
  {
    method: "POST",
    path: "/api/trips",
    description: "Cria um plano; moeda, clima e capa são preenchidos automaticamente.",
    auth: true,
  },
  {
    method: "GET",
    path: "/api/trips/{id}",
    description: "Detalhe de uma viagem (só do próprio usuário).",
    auth: true,
  },
  {
    method: "PATCH",
    path: "/api/trips/{id}",
    description: "Atualiza o plano ou o relato da viagem.",
    auth: true,
  },
  { method: "DELETE", path: "/api/trips/{id}", description: "Exclui a viagem.", auth: true },
  {
    method: "POST",
    path: "/api/trips/complete",
    description: "Marca várias viagens como realizadas, com relato, em lote.",
    auth: true,
  },
  {
    method: "GET",
    path: "/api/trips/{id}/cover",
    description: "Imagem de capa enviada pelo usuário (binário, com cache).",
    auth: true,
  },
  {
    method: "GET",
    path: "/api/destinations/search?q=",
    description: "Autocomplete de destinos (cidade, estado, país).",
    auth: true,
  },
  {
    method: "GET",
    path: "/api/destinations/insights",
    description: "País, moeda e cotação, temperatura média e imagem sugerida de um destino.",
    auth: true,
  },
  { method: "GET", path: "/api/openapi.json", description: "Especificação OpenAPI da API.", auth: false },
];

export interface ExternalApiInfo {
  name: string;
  purpose: string;
  endpoint: string;
  cache: string;
  href: string;
}

export const EXTERNAL_APIS: ExternalApiInfo[] = [
  {
    name: "Open-Meteo Geocoding",
    purpose: "Autocomplete de destinos: cidade, estado, país e coordenadas.",
    endpoint: "geocoding-api.open-meteo.com/v1/search",
    cache: "1 dia",
    href: "https://open-meteo.com/en/docs/geocoding-api",
  },
  {
    name: "Open-Meteo Forecast",
    purpose: "Temperatura prevista quando o período está nos próximos 16 dias.",
    endpoint: "api.open-meteo.com/v1/forecast",
    cache: "6 h",
    href: "https://open-meteo.com/en/docs",
  },
  {
    name: "Open-Meteo Archive",
    purpose: "Temperatura histórica: as mesmas datas do ano anterior.",
    endpoint: "archive-api.open-meteo.com/v1/archive",
    cache: "6 h",
    href: "https://open-meteo.com/en/docs/historical-weather-api",
  },
  {
    name: "AwesomeAPI",
    purpose: "Cotação da moeda local em reais (fonte primária).",
    endpoint: "economia.awesomeapi.com.br/json/last/{MOEDA}-BRL",
    cache: "1 h",
    href: "https://docs.awesomeapi.com.br/api-de-moedas",
  },
  {
    name: "ExchangeRate-API",
    purpose: "Cotação — 1º fallback (cobre moedas que a AwesomeAPI não tem, como IDR).",
    endpoint: "open.er-api.com/v6/latest/{MOEDA}",
    cache: "1 h",
    href: "https://www.exchangerate-api.com",
  },
  {
    name: "Frankfurter (BCE)",
    purpose: "Cotação — 2º fallback, com dados do Banco Central Europeu.",
    endpoint: "api.frankfurter.dev/v1/latest",
    cache: "1 h",
    href: "https://frankfurter.dev",
  },
  {
    name: "Wikipédia (MediaWiki)",
    purpose: "Imagem de capa sugerida do destino (em português e depois em inglês).",
    endpoint: "{pt,en}.wikipedia.org/w/api.php",
    cache: "1 dia",
    href: "https://www.mediawiki.org/wiki/API:Main_page",
  },
  {
    name: "Wikimedia Commons",
    purpose: "Autor e licença da imagem sugerida (atribuição exibida na tela).",
    endpoint: "commons.wikimedia.org/w/api.php",
    cache: "1 dia",
    href: "https://commons.wikimedia.org",
  },
  {
    name: "FlagCDN",
    purpose: "Bandeira do país (o navegador carrega a imagem direto da URL).",
    endpoint: "flagcdn.com/w320/{cca2}.png",
    cache: "—",
    href: "https://flagcdn.com",
  },
  {
    name: "world-countries (npm)",
    purpose: "Dataset estático: nome do país em português e moeda principal. Sem rede.",
    endpoint: "pacote local",
    cache: "—",
    href: "https://www.npmjs.com/package/world-countries",
  },
];

export const STACK = [
  "Next.js 16 (App Router)",
  "React 19",
  "TypeScript",
  "Tailwind CSS v4",
  "Banco em memória (parte 1)",
  "PostgreSQL + Drizzle (parte 2)",
  "Zod",
  "JWT (jose) + bcrypt",
  "Vercel",
] as const;

export const PROTECTIONS = [
  "Timeout de 5 s por chamada e User-Agent identificando o app.",
  "Falha de API externa nunca derruba a rota: o bloco vira null e a tela mostra “Indisponível”.",
  "Cache em memória com TTL e junção de chamadas simultâneas iguais.",
  "Respeita 429 (Too Many Requests): o host entra em pausa pelo Retry-After.",
  "Cotação com cadeia de fallback: AwesomeAPI → ExchangeRate-API → Frankfurter.",
] as const;
