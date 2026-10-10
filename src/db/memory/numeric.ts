/**
 * Arredonda como o NUMERIC do Postgres (metade para longe do zero), sem os erros de
 * ponto flutuante de `x * 10^n` (ex.: 1,005 → 1,01). Mantém a paridade com as colunas
 * `numeric(14,6)` (cotação), `numeric(4,1)` (temperaturas) e `numeric(12,2)` (gastos).
 */
export function roundTo(value: number, scale: number): number {
  const text = String(Math.abs(value));
  // Notação científica ("1e-7"): raro e sem ganho em tratar por string.
  if (text.includes("e")) return Number(value.toFixed(scale));

  const rounded = Math.round(Number(`${text}e${scale}`));
  const result = Number(`${rounded}e-${scale}`);
  return value < 0 && result !== 0 ? -result : result;
}

export const roundNullable = (value: number | null, scale: number): number | null =>
  value === null ? null : roundTo(value, scale);
