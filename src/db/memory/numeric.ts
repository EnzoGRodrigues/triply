/**
 * Arredonda como o NUMERIC do Postgres (metade para longe do zero), sem os erros de
 * ponto flutuante (ex.: 1,005 → 1,01; 0,0000005 → 0,000001). Mantém a paridade com as colunas
 * `numeric(14,6)` (cotação), `numeric(4,1)` (temperaturas) e `numeric(12,2)` (gastos).
 */

/**
 * Número sem notação científica: `String(5e-7)` é "5e-7", mas o Postgres lê o texto como o
 * decimal exato 0,0000005. Expandir o expoente evita cair em `toFixed`, que trabalha com o
 * binário (5e-7 vale 4,99999…e-7 e arredondaria para 0 em vez de 0,000001).
 */
function plainDecimal(value: number): string {
  const text = String(Math.abs(value));
  const match = /^(\d+)(?:\.(\d+))?e([+-]\d+)$/.exec(text);
  if (!match) return text;

  const [, integer, fraction = "", exponent] = match;
  const digits = integer + fraction;
  const pointAt = integer.length + Number(exponent); // onde fica o ponto decimal dentro de `digits`

  if (pointAt <= 0) return `0.${"0".repeat(-pointAt)}${digits}`;
  if (pointAt >= digits.length) return digits + "0".repeat(pointAt - digits.length);
  return `${digits.slice(0, pointAt)}.${digits.slice(pointAt)}`;
}

export function roundTo(value: number, scale: number): number {
  const [integer, fraction = ""] = plainDecimal(value).split(".");
  if (fraction.length <= scale) return value; // já cabe na escala: nada a arredondar

  // Arredonda nos DÍGITOS do texto (BigInt), sem passar por ponto flutuante: o Postgres decide
  // pelo decimal exato — metade ("5" em diante) para longe do zero.
  const kept = BigInt(integer + fraction.slice(0, scale));
  const rounded = kept + BigInt(fraction.charCodeAt(scale) >= 53 ? 1 : 0); // 53 = "5"
  const digits = rounded.toString().padStart(scale + 1, "0");
  const result = Number(`${digits.slice(0, digits.length - scale)}.${digits.slice(digits.length - scale)}`);
  return value < 0 && result !== 0 ? -result : result;
}

export const roundNullable = (value: number | null, scale: number): number | null =>
  value === null ? null : roundTo(value, scale);
