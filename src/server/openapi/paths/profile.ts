import { exampleUser } from "../examples";
import { responseRef } from "../responses";
import { ref, type JsonObject } from "../types";

export const profilePaths: Record<string, JsonObject> = {
  "/api/profile": {
    get: {
      tags: ["Perfil"],
      operationId: "getProfile",
      summary: "Perfil e estatísticas",
      description:
        "Usuário logado + estatísticas das viagens: `cities` = cidades distintas (`lower(coalesce(city, destination))`) e `countries` = países distintos (`countryCode`) entre as viagens **realizadas**.",
      responses: {
        "200": {
          description: "Perfil.",
          content: {
            "application/json": {
              schema: ref("ProfileResponse"),
              example: {
                user: exampleUser,
                stats: { cities: 2, countries: 2, completedTrips: 2, plannedTrips: 5 },
              },
            },
          },
        },
        "401": responseRef("Unauthorized"),
        "500": responseRef("InternalError"),
      },
    },
  },
};
