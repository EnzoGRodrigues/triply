import { exampleTripEnriquecida, exampleTripPlanejada, exampleTripRealizada } from "../examples";
import { errorResponse, responseRef } from "../responses";
import { ref, type JsonObject } from "../types";

const tripId = {
  name: "id",
  in: "path",
  required: true,
  description: "Id (UUID) da viagem. Viagem de outro usuário ou id malformado → `404`.",
  schema: { type: "string", format: "uuid" },
  example: "20b8d434-99f3-48a7-bd64-2fac54d25dd3",
};

const json = (schemaName: string, example?: unknown): JsonObject => ({
  "application/json": { schema: ref(schemaName), ...(example !== undefined ? { example } : {}) },
});

const validationWithFields = (summary: string, fields: Record<string, string>, message = "Dados inválidos. Revise os campos informados.") =>
  errorResponse("Dados inválidos.", {
    exemplo: { summary, code: "VALIDATION_ERROR", message, fields },
  });

const enrichmentNote =
  "\n\n**Enriquecimento automático:** se o destino for geolocalizado (`latitude`+`longitude` ou `countryCode`) e vierem vazios moeda/cotação, temperaturas ou capa, o back os completa usando as mesmas APIs externas de `/api/destinations/insights` (orçamento de 8 s). Falha de API externa **nunca** impede salvar; valores enviados pelo cliente sempre vencem.";

export const tripPaths: Record<string, JsonObject> = {
  "/api/trips": {
    get: {
      tags: ["Viagens"],
      operationId: "listTrips",
      summary: "Listar viagens",
      description:
        "Lista as viagens **do usuário logado**. Ordenação: planejadas por `startDate` crescente (sem data no fim); realizadas por `completedAt` decrescente. Sem `status`, vêm as planejadas e depois as realizadas.",
      parameters: [
        {
          name: "status",
          in: "query",
          required: false,
          description: "Filtra por status.",
          schema: ref("TripStatus"),
          example: "planejada",
        },
      ],
      responses: {
        "200": {
          description: "Lista de viagens.",
          content: json("TripListResponse", { trips: [exampleTripPlanejada] }),
        },
        "400": validationWithFields("Status inválido", { status: "Status inválido. Use planejada ou realizada." }),
        "401": responseRef("Unauthorized"),
        "500": responseRef("InternalError"),
      },
    },
    post: {
      tags: ["Viagens"],
      operationId: "createTrip",
      summary: "Criar viagem planejada",
      description: "Cria uma viagem com `status = planejada`. Só `destination` é obrigatório." + enrichmentNote,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: ref("TripInput"),
            examples: {
              minimo: {
                summary: "Só com destino e coordenadas (o back completa o resto)",
                value: {
                  destination: "Tulum, México",
                  city: "Tulum",
                  region: "Quintana Roo",
                  countryCode: "MX",
                  latitude: 20.21173,
                  longitude: -87.46325,
                  startDate: "2027-06-10",
                  endDate: "2027-06-21",
                },
              },
              completo: {
                summary: "Completo (como o front envia depois do painel \"Sobre o destino\")",
                value: {
                  destination: "Tulum, México",
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
                  exchangeRate: 0.270836,
                  tempMin: 26.3,
                  tempMax: 30.5,
                  coverImage: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Tulum_2.jpg/1280px-Tulum_2.jpg",
                  coverImageSource: "wikipedia",
                },
              },
            },
          },
        },
      },
      responses: {
        "201": { description: "Viagem criada.", content: json("TripResponse", { trip: exampleTripEnriquecida }) },
        "400": validationWithFields("Destino vazio e volta antes da ida", {
          destination: "Informe o destino.",
          endDate: "A volta deve ser no mesmo dia ou depois da ida.",
        }),
        "401": responseRef("Unauthorized"),
        "500": responseRef("InternalError"),
      },
    },
  },

  "/api/trips/complete": {
    post: {
      tags: ["Viagens"],
      operationId: "completeTrips",
      summary: "Marcar viagens como realizadas (em lote)",
      description:
        "Marca várias viagens como `realizada` (`completedAt = agora`) com o relato de cada uma, **em uma transação**: se qualquer id não existir (ou for de outro usuário), nada é alterado e a resposta é `404`. Devolve as viagens atualizadas na ordem enviada. Se uma viagem já era realizada, o `completedAt` original é preservado.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: ref("CompleteTripsInput"),
            example: {
              trips: [
                {
                  id: "37d4b88f-c271-42e7-b686-a60c513917f0",
                  rating: 5,
                  companions: "amigos",
                  expenses: 3500.5,
                  experience: "Linda!",
                },
                { id: "9a6f9b1e-6f6b-4a3e-8c0e-2f6f3d5d7a10" },
              ],
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Viagens atualizadas, na ordem enviada.",
          content: json("TripListResponse", {
            trips: [{ ...exampleTripPlanejada, status: "realizada", completedAt: "2026-10-10T01:00:13.841Z", rating: 5, companions: "amigos", expenses: 3500.5, experience: "Linda!" }],
          }),
        },
        "400": validationWithFields("Lista vazia", { trips: "Selecione ao menos uma viagem." }),
        "401": responseRef("Unauthorized"),
        "404": responseRef("NotFound"),
        "500": responseRef("InternalError"),
      },
    },
  },

  "/api/trips/{id}": {
    parameters: [tripId],
    get: {
      tags: ["Viagens"],
      operationId: "getTrip",
      summary: "Detalhar viagem",
      responses: {
        "200": { description: "A viagem.", content: json("TripResponse", { trip: exampleTripRealizada }) },
        "401": responseRef("Unauthorized"),
        "404": responseRef("NotFound"),
        "500": responseRef("InternalError"),
      },
    },
    patch: {
      tags: ["Viagens"],
      operationId: "updateTrip",
      summary: "Editar viagem (parcial)",
      description:
        "Atualiza qualquer subconjunto de campos, inclusive o relato. Campo omitido = mantém; `null` = limpa.\n\n" +
        "- Ida/volta e temperaturas são validadas **junto com o que já está salvo** (ex.: enviar só `endDate` anterior à ida salva → `400`).\n" +
        "- Relato (`rating`, `companions`, `expenses`, `experience` não nulos) só vale para viagens `realizada`; numa planejada → `400` (use `POST /api/trips/complete`).\n" +
        "- `coverImage` com data URL troca a capa por upload; URL https usa a externa; `null` remove." +
        enrichmentNote +
        " Na edição, o back só refaz o que depende do que mudou (destino → moeda, clima e capa automática; datas → clima) e **nunca** troca uma capa enviada por upload. Se o destino mudar e não houver foto do novo destino, a capa automática antiga (Wikipedia ou URL) é **removida** em vez de ficar a foto do destino anterior.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: ref("TripUpdateInput"),
            examples: {
              relato: {
                summary: "Editar o relato de uma viagem realizada",
                value: { rating: 5, experience: "Melhor viagem da vida!" },
              },
              datas: {
                summary: "Mudar as datas (o clima é recalculado)",
                value: { startDate: "2027-12-01", endDate: "2027-12-10" },
              },
              removerCapa: { summary: "Remover a capa", value: { coverImage: null } },
            },
          },
        },
      },
      responses: {
        "200": { description: "Viagem atualizada.", content: json("TripResponse", { trip: { ...exampleTripRealizada, rating: 5, experience: "Melhor viagem da vida!" } }) },
        "400": errorResponse("Dados inválidos.", {
          datas: {
            summary: "Volta antes da ida já salva",
            code: "VALIDATION_ERROR",
            message: "Dados inválidos. Revise os campos informados.",
            fields: { endDate: "A volta deve ser no mesmo dia ou depois da ida." },
          },
          relatoEmPlanejada: {
            summary: "Relato em viagem planejada",
            code: "VALIDATION_ERROR",
            message: "Marque a viagem como realizada para registrar o relato.",
            fields: { rating: "Só é possível avaliar viagens realizadas." },
          },
          capaInvalida: {
            summary: "Capa inválida ou grande demais",
            code: "VALIDATION_ERROR",
            message: "Dados inválidos. Revise os campos informados.",
            fields: {
              coverImage:
                "A capa deve ser uma imagem PNG, JPEG, WebP ou GIF de até 2 MB (data URL) ou uma URL https válida.",
            },
          },
        }),
        "401": responseRef("Unauthorized"),
        "404": responseRef("NotFound"),
        "500": responseRef("InternalError"),
      },
    },
    delete: {
      tags: ["Viagens"],
      operationId: "deleteTrip",
      summary: "Excluir viagem",
      responses: {
        "204": { description: "Viagem excluída." },
        "401": responseRef("Unauthorized"),
        "404": responseRef("NotFound"),
        "500": responseRef("InternalError"),
      },
    },
  },

  "/api/trips/{id}/cover": {
    parameters: [tripId],
    get: {
      tags: ["Viagens"],
      operationId: "getTripCover",
      summary: "Capa enviada por upload (binário)",
      description:
        "Devolve a imagem enviada pelo usuário, com o `Content-Type` real. Só o dono da viagem acessa. Capas **externas** (Wikipedia, URL) não passam por aqui — o `coverImageUrl` já é a URL direta. O `coverImageUrl` de uploads traz `?v=<updatedAt em ms>`: com `v` o conteúdo é imutável (cache de 1 ano, privado).",
      parameters: [
        {
          name: "v",
          in: "query",
          required: false,
          description: "Versão da imagem (`updatedAt` em ms). Quando presente, a resposta é cacheável como imutável.",
          schema: { type: "integer" },
          example: 1791594012452,
        },
      ],
      responses: {
        "200": {
          description: "Imagem da capa.",
          headers: {
            "Cache-Control": {
              description: "`private, max-age=31536000, immutable` com `?v=`; `private, no-cache` sem ele.",
              schema: { type: "string" },
            },
            "X-Content-Type-Options": { schema: { type: "string", enum: ["nosniff"] } },
          },
          content: {
            "image/jpeg": { schema: { type: "string", contentMediaType: "image/jpeg" } },
            "image/png": { schema: { type: "string", contentMediaType: "image/png" } },
            "image/webp": { schema: { type: "string", contentMediaType: "image/webp" } },
            "image/gif": { schema: { type: "string", contentMediaType: "image/gif" } },
          },
        },
        "401": responseRef("Unauthorized"),
        "404": errorResponse("Viagem inexistente, de outro usuário ou sem capa enviada por upload.", {
          semCapa: { summary: "Sem capa por upload", code: "NOT_FOUND", message: "Esta viagem não tem capa enviada." },
        }),
        "500": responseRef("InternalError"),
      },
    },
  },
};
