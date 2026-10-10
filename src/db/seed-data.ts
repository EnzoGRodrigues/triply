/**
 * Dados de demonstração, compartilhados pelos dois bancos:
 *  - memória: o store se popula sozinho com isto no primeiro acesso;
 *  - Postgres: `npm run db:seed` grava exatamente os mesmos registros.
 *
 * Os ids são FIXOS de propósito: depois de um *cold start* (ex.: na Vercel) o cookie
 * JWT da conta de demonstração e links como `/viagens/<id>` continuam válidos. As datas de criação
 * também são fixas, para as respostas serem idênticas entre reinícios.
 */

import type { NewTrip, NewUser } from "./types";

export const DEMO_PASSWORD = "triply123";

export const DEMO_USER_ID = "c2ff10ff-7778-4236-97ac-4a588381f0d3";

/** Momento de referência dos registros de demonstração. */
const SEED_AT = "2026-10-01T12:00:00.000Z";

/** Conta de demonstração (sem o hash da senha — ver `buildDemoData`). */
export function demoUser(): Omit<NewUser, "passwordHash"> {
  return {
    id: DEMO_USER_ID,
    name: "Enzo Rodrigues",
    email: "enzo@triply.app",
    createdAt: new Date(SEED_AT),
  };
}

/** Thumbnails de 1280 px validados em docs/research/seed-imagens.md (CC BY / CC BY-SA). */
const COVERS = {
  madrid:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Plaza_Mayor_de_Madrid_-_01.jpg/1280px-Plaza_Mayor_de_Madrid_-_01.jpg",
  paris:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Panoramic_view_on_the_illuminated_7th_arrondissement_of_Paris_at_sunset_in_France.jpg/1280px-Panoramic_view_on_the_illuminated_7th_arrondissement_of_Paris_at_sunset_in_France.jpg",
  maragogi:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Praia_do_paiva_-_Maragogi_-_Alagoas_%282%29.jpg/1280px-Praia_do_paiva_-_Maragogi_-_Alagoas_%282%29.jpg",
  bali: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Tanah_Lot%2C_Bali%2C_Indonesia%2C_20220827_0957_1098.jpg/1280px-Tanah_Lot%2C_Bali%2C_Indonesia%2C_20220827_0957_1098.jpg",
  barraGrande:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Barra_Grande_%2826070630347%29.jpg/1280px-Barra_Grande_%2826070630347%29.jpg",
  natal:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Ponta_Negra_Beach%2C_Natal%2C_Brazil.jpg/1280px-Ponta_Negra_Beach%2C_Natal%2C_Brazil.jpg",
  tulum:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Maya_ruins_at_Tulum_2023_-_beach.jpg/1280px-Maya_ruins_at_Tulum_2023_-_beach.jpg",
} as const;

const external = (url: string): NewTrip["cover"] => ({ kind: "external", url, source: "externa" });

/** As 7 viagens da demonstração: 2 realizadas e 5 planejadas (2027). Objetos novos a cada chamada. */
export function demoTrips(): NewTrip[] {
  const at = () => new Date(SEED_AT);
  const base = { createdAt: at(), updatedAt: at() };

  return [
    // ───────── realizadas ─────────
    {
      ...base,
      id: "4c342300-4282-479d-8c6b-ea69e072a1ed",
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
      exchangeRateAt: at(),
      tempMin: 18,
      tempMax: 33,
      cover: external(COVERS.madrid),
      completedAt: new Date("2025-07-25T15:00:00Z"),
      rating: 4,
      companions: "familia",
      expenses: 16000.27,
      experience:
        "Minha viagem foi simplesmente incrível! Foram dias repletos de novas experiências, paisagens deslumbrantes e momentos inesquecíveis.",
    },
    {
      ...base,
      id: "c49664be-9594-4587-bafc-7fd7f77bcf04",
      status: "realizada",
      destination: "França",
      city: "Paris",
      region: "Ilha de França",
      country: "França",
      countryCode: "FR",
      latitude: 48.85341,
      longitude: 2.3488,
      startDate: "2024-04-12",
      endDate: "2024-04-22",
      accommodation: "Hôtel Le Marais Bastille",
      activities: "Torre Eiffel, Museu do Louvre e passeio de barco pelo Sena",
      transport: "aviao",
      currencyCode: "EUR",
      exchangeRate: 6.27,
      exchangeRateAt: at(),
      tempMin: 8,
      tempMax: 17,
      cover: external(COVERS.paris),
      completedAt: new Date("2024-04-30T12:00:00Z"),
      rating: 5,
      companions: "casal",
      expenses: 21450,
      experience:
        "Paris superou todas as expectativas: caminhadas à beira do Sena, museus incríveis e uma vista da Torre Eiffel que nunca vou esquecer.",
    },

    // ───────── planejadas ─────────
    {
      ...base,
      id: "20260f1d-c050-4ac7-ad2b-177070b8fd63",
      status: "planejada",
      destination: "Maragogi - Alagoas",
      city: "Maragogi",
      region: "Alagoas",
      country: "Brasil",
      countryCode: "BR",
      latitude: -9.01222,
      longitude: -35.2225,
      startDate: "2027-01-15",
      endDate: "2027-01-22",
      accommodation: "Pousada Maragogi Beach",
      activities: "Passeio de catamarã até as galés",
      transport: "aviao",
      currencyCode: "BRL",
      exchangeRate: 1,
      exchangeRateAt: at(),
      tempMin: 24.5,
      tempMax: 31,
      cover: external(COVERS.maragogi),
    },
    {
      ...base,
      id: "83988c25-a2c9-4eff-80f4-f8424cb2f325",
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
      exchangeRateAt: at(),
      tempMin: 24,
      tempMax: 32,
      cover: external(COVERS.tulum),
    },
    {
      ...base,
      id: "b7821cb8-78d6-4664-ab68-7377133463fb",
      status: "planejada",
      destination: "Indonésia",
      city: "Bali",
      region: "Bali",
      country: "Indonésia",
      countryCode: "ID",
      latitude: -8.4095,
      longitude: 115.18892,
      startDate: "2027-07-05",
      endDate: "2027-07-19",
      accommodation: "Villa em Ubud",
      activities: "Templo de Tanah Lot, trilha no vulcão Batur e surf em Uluwatu",
      transport: "aviao",
      currencyCode: "IDR",
      exchangeRate: 0.00028,
      exchangeRateAt: at(),
      tempMin: 23,
      tempMax: 31,
      cover: external(COVERS.bali),
    },
    {
      ...base,
      id: "7ef2ec4e-1c79-49df-a84a-c52eef49ce35",
      status: "planejada",
      destination: "Barra Grande - Piauí",
      city: "Barra Grande",
      region: "Piauí",
      country: "Brasil",
      countryCode: "BR",
      latitude: -2.91137,
      longitude: -41.40985,
      startDate: "2027-09-10",
      endDate: "2027-09-17",
      accommodation: "Pousada Kitesurf Barra Grande",
      activities: "Kitesurf e passeio de buggy pelas dunas",
      transport: "carro",
      currencyCode: "BRL",
      exchangeRate: 1,
      exchangeRateAt: at(),
      tempMin: 25,
      tempMax: 32,
      cover: external(COVERS.barraGrande),
    },
    {
      ...base,
      id: "41dccbbc-d73e-4ed3-aba0-6f6107887c6b",
      status: "planejada",
      destination: "Natal - Rio Grande do Norte",
      city: "Natal",
      region: "Rio Grande do Norte",
      country: "Brasil",
      countryCode: "BR",
      latitude: -5.795,
      longitude: -35.20944,
      startDate: "2027-11-20",
      endDate: "2027-11-27",
      accommodation: "Hotel Ponta Negra",
      activities: "Passeio de buggy em Genipabu e Praia de Ponta Negra",
      transport: "aviao",
      currencyCode: "BRL",
      exchangeRate: 1,
      exchangeRateAt: at(),
      tempMin: 24,
      tempMax: 30,
      cover: external(COVERS.natal),
    },
  ];
}
