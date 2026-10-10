import { exampleInsights, exampleSearchResults } from "../examples";
import { errorResponse, responseRef } from "../responses";
import { ref, type JsonObject } from "../types";

const json = (schemaName: string, example?: unknown): JsonObject => ({
  "application/json": { schema: ref(schemaName), ...(example !== undefined ? { example } : {}) },
});

const queryParam = (
  name: string,
  description: string,
  schema: JsonObject,
  example: unknown,
  required = false,
): JsonObject => ({ name, in: "query", required, description, schema, example });

export const destinationPaths: Record<string, JsonObject> = {
  "/api/destinations/search": {
    get: {
      tags: ["Destinos / APIs externas"],
      operationId: "searchDestinations",
      summary: "Autocomplete de destinos",
      description:
        "Busca cidades, regiões e países pelo nome (até 8 resultados) consumindo o **Open-Meteo Geocoding**. Os resultados são ranqueados por uma pontuação que soma a **relevância do nome** (igual ao digitado > começa com ele > contém > nome alternativo, como \"Banguecoque\" para \"Bangkok\") e a **importância do lugar** (população e tipo: capitais, sedes de estado, ilhas e países ganham bônus), então cidades famosas vêm antes de lugarejos homônimos — \"Bangkok\" traz Banguecoque, \"Madri\" traz Madrid, \"Tokyo\" traz Tóquio e \"Nova York\" traz Nova Iorque. Aeroportos, parques e outros pontos de interesse são descartados. O `label` já vem pronto para usar como `destination` da viagem.\n\nAs respostas ficam em cache (memória + Data Cache do Next, 7 dias). Se o serviço externo estiver fora do ar a resposta é `502` (uma lista vazia seria enganosa).",
      parameters: [
        queryParam("q", "Texto da busca (2 a 100 caracteres).", { type: "string", minLength: 2, maxLength: 100 }, "Maragogi", true),
      ],
      responses: {
        "200": {
          description: "Destinos encontrados (lista vazia se nada casar).",
          content: json("DestinationSearchResponse", { results: exampleSearchResults }),
        },
        "400": errorResponse("`q` ausente ou com menos de 2 caracteres.", {
          curto: { summary: "Busca curta", code: "VALIDATION_ERROR", message: "Dados inválidos. Revise os campos informados.", fields: { q: "Digite ao menos 2 caracteres." } },
        }),
        "401": responseRef("Unauthorized"),
        "502": responseRef("ExternalApiError"),
        "500": responseRef("InternalError"),
      },
    },
  },

  "/api/destinations/insights": {
    get: {
      tags: ["Destinos / APIs externas"],
      operationId: "getDestinationInsights",
      summary: "Informações do destino (país, moeda, clima e imagem)",
      description:
        "Reúne dados de **várias APIs externas** para o painel \"Sobre o destino\":\n\n" +
        "- **`country`** — dataset `world-countries` (nome em pt) + bandeira da flagcdn;\n" +
        "- **`currency`** — AwesomeAPI → ExchangeRate-API → Frankfurter (cadeia de fallback): cotação da moeda local em R$;\n" +
        "- **`climate`** — Open-Meteo Forecast (período todo em até 16 dias) ou Open-Meteo Archive (mesmas datas de um ano anterior);\n" +
        "- **`image`** — Wikipedia/MediaWiki (foto de capa) + Wikimedia Commons (autor e licença).\n\n" +
        "**Cada bloco falha de forma independente:** se uma API estiver fora do ar, aquele bloco vem `null` e a resposta continua `200`. Informe ao menos `name`, `countryCode` ou `lat`+`lon`.",
      parameters: [
        queryParam("name", 'Nome ou rótulo do destino ("Natal", "Natal - Rio Grande do Norte", "Tulum, México"). Ajuda a desambiguar a imagem.', { type: "string", maxLength: 160 }, "Tulum"),
        queryParam("countryCode", "País (ISO 3166-1 alpha-2). Define a moeda.", { type: "string", pattern: "^[A-Za-z]{2}$" }, "MX"),
        queryParam("lat", "Latitude. Obrigatória para o clima; deve vir junto com `lon`.", { type: "number", minimum: -90, maximum: 90 }, 20.21173),
        queryParam("lon", "Longitude. Deve vir junto com `lat`.", { type: "number", minimum: -180, maximum: 180 }, -87.46325),
        queryParam("start", "Ida (`YYYY-MM-DD`). Define o período do clima; sem datas, usa a previsão dos próximos 7 dias.", { type: "string", format: "date" }, "2027-06-10"),
        queryParam("end", "Volta (`YYYY-MM-DD`), igual ou posterior a `start`. Períodos são limitados a 31 dias.", { type: "string", format: "date" }, "2027-06-21"),
      ],
      responses: {
        "200": {
          description: "Insights do destino (blocos indisponíveis vêm `null`).",
          content: json("DestinationInsightsResponse", exampleInsights),
        },
        "400": errorResponse("Parâmetros inválidos.", {
          semDestino: {
            summary: "Nenhum identificador do destino",
            code: "VALIDATION_ERROR",
            message: "Dados inválidos. Revise os campos informados.",
            fields: { name: "Informe o destino (name), o país (countryCode) ou as coordenadas (lat e lon)." },
          },
          datasInvertidas: {
            summary: "Volta antes da ida",
            code: "VALIDATION_ERROR",
            message: "Dados inválidos. Revise os campos informados.",
            fields: { end: "A volta deve ser no mesmo dia ou depois da ida." },
          },
        }),
        "401": responseRef("Unauthorized"),
        "500": responseRef("InternalError"),
      },
    },
  },
};
