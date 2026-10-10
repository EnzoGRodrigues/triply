/** Objeto JSON genérico: a spec é um documento OpenAPI 3.1 montado à mão. */
export type JsonObject = { [key: string]: unknown };

export const ref = (name: string, section: "schemas" | "responses" | "parameters" = "schemas") => ({
  $ref: `#/components/${section}/${name}`,
});

/** `{ oneOf: [X, null] }` para campos anuláveis que apontam para um schema nomeado. */
export const nullableRef = (name: string, description?: string): JsonObject => ({
  ...(description ? { description } : {}),
  oneOf: [ref(name), { type: "null" }],
});
