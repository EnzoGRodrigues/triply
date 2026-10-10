/**
 * Exemplos reais (respostas capturadas do back-end rodando com o seed).
 * Reutilizados em vários endpoints para a documentação ficar consistente.
 */

export const exampleUser = {
  id: "12670cfe-04b1-45de-a8ed-5aaf9a0c928e",
  name: "Enzo Rodrigues",
  email: "enzo@triply.app",
  createdAt: "2026-10-10T00:59:36.434Z",
};

export const exampleTripRealizada = {
  id: "20b8d434-99f3-48a7-bd64-2fac54d25dd3",
  status: "realizada",
  destination: "Espanha",
  city: "Madrid",
  region: "Comunidade de Madri",
  country: "Espanha",
  countryCode: "ES",
  latitude: 40.4165,
  longitude: -3.70256,
  startDate: "2025-07-05",
  endDate: "2025-07-19",
  accommodation: "Madrid Downtown Hostel",
  activities: "Museu Nacional Centro de Arte Reina Sofía",
  transport: "aviao",
  currencyCode: "EUR",
  exchangeRate: 6.27,
  exchangeRateAt: "2026-10-10T00:59:36.347Z",
  tempMin: 18,
  tempMax: 33,
  coverImageUrl:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Plaza_Mayor_de_Madrid_-_01.jpg/1280px-Plaza_Mayor_de_Madrid_-_01.jpg",
  coverImageSource: "externa",
  completedAt: "2025-07-25T15:00:00.000Z",
  rating: 4,
  companions: "familia",
  expenses: 16000.27,
  experience:
    "Minha viagem foi simplesmente incrível! Foram dias repletos de novas experiências, paisagens deslumbrantes e momentos inesquecíveis.",
  createdAt: "2026-10-10T00:59:36.434Z",
  updatedAt: "2026-10-10T00:59:36.434Z",
};

export const exampleTripPlanejada = {
  id: "37d4b88f-c271-42e7-b686-a60c513917f0",
  status: "planejada",
  destination: "México",
  city: "Tulum",
  region: "Quintana Roo",
  country: "México",
  countryCode: "MX",
  latitude: 20.21173,
  longitude: -87.46325,
  startDate: "2027-06-10",
  endDate: "2027-06-21",
  accommodation: "Hostal Mulut Tulum",
  activities: "Mergulhar em um cenote e passear por Tulum",
  transport: "aviao",
  currencyCode: "MXN",
  exchangeRate: 0.29,
  exchangeRateAt: "2026-10-10T00:59:36.347Z",
  tempMin: 24,
  tempMax: 32,
  coverImageUrl:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Maya_ruins_at_Tulum_2023_-_beach.jpg/1280px-Maya_ruins_at_Tulum_2023_-_beach.jpg",
  coverImageSource: "externa",
  completedAt: null,
  rating: null,
  companions: null,
  expenses: null,
  experience: null,
  createdAt: "2026-10-10T00:59:36.434Z",
  updatedAt: "2026-10-10T00:59:36.434Z",
};

/** Viagem criada só com destino + coordenadas: o back completou moeda, clima e capa. */
export const exampleTripEnriquecida = {
  ...exampleTripPlanejada,
  id: "1a514102-a641-40ee-a3fe-b2ff307ccae2",
  destination: "Tulum, México",
  exchangeRate: 0.270836,
  exchangeRateAt: "2026-10-09T21:03:56.000Z",
  tempMin: 26.3,
  tempMax: 30.5,
  coverImageUrl:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Tulum_2.jpg/1280px-Tulum_2.jpg",
  coverImageSource: "wikipedia",
};

export const exampleSearchResults = [
  {
    id: "3395458",
    name: "Maragogi",
    region: "Alagoas",
    country: "Brasil",
    countryCode: "BR",
    latitude: -9.01222,
    longitude: -35.2225,
    label: "Maragogi - Alagoas",
  },
  {
    id: "3457850",
    name: "Maragogipe",
    region: "Bahia",
    country: "Brasil",
    countryCode: "BR",
    latitude: -12.77778,
    longitude: -38.91944,
    label: "Maragogipe - Bahia",
  },
];

export const exampleInsights = {
  country: { code: "MX", name: "México", flagUrl: "https://flagcdn.com/w320/mx.png" },
  currency: {
    code: "MXN",
    name: "Peso mexicano",
    symbol: "MX$",
    rateToBRL: 0.270836,
    label: "1 MXN = R$ 0,27",
    updatedAt: "2026-10-09T21:03:56.000Z",
    source: "AwesomeAPI",
    sourceUrl: "https://docs.awesomeapi.com.br/api-de-moedas",
  },
  climate: { min: 26.3, max: 30.5, label: "≈ 26 a 31 °C", source: "historico" },
  image: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Tulum_2.jpg/1280px-Tulum_2.jpg",
    source: "Wikipedia",
    attribution: "Popo le Chien",
    license: "CC BY-SA 3.0",
    pageUrl: "https://commons.wikimedia.org/wiki/File:Tulum_2.jpg",
  },
};

export const exampleSessionCookie =
  "triply_session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjY3MGNmZS0wNGIxLTQ1ZGUtYThlZC01YWFmOWEwYzkyOGUifQ.assinatura; Path=/; Max-Age=604800; HttpOnly; SameSite=lax";
