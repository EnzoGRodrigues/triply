import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Companions, Transport } from "@/types/api";

/* ───────────────────────────── Datas ───────────────────────────── */

/** "YYYY-MM-DD" → Date local (sem deslocamento de fuso). */
function parseDateOnly(value: string | null | undefined) {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

/** "2027-06-10" → "10/06/2027" */
export function formatDate(value: string | null | undefined): string {
  const date = parseDateOnly(value);
  return date ? format(date, "dd/MM/yyyy") : "—";
}

/** Data de hoje (fuso local) como "YYYY-MM-DD". */
export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** ISO 8601 → "outubro de 2026" */
export function formatMonthYear(value: string | null | undefined): string {
  if (!value) return "—";
  const date = parseISO(value);
  return isValid(date) ? format(date, "MMMM 'de' yyyy", { locale: ptBR }) : "—";
}

/** ISO 8601 → "09/10/2026 21:00" */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = parseISO(value);
  return isValid(date) ? format(date, "dd/MM/yyyy HH:mm") : "—";
}

/** "10/06 – 21/06/2027" (ano compartilhado aparece uma vez). `null` se não houver datas. */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const from = parseDateOnly(start);
  const to = parseDateOnly(end);
  if (from && to) {
    if (from.getFullYear() === to.getFullYear()) {
      return `${format(from, "dd/MM")} – ${format(to, "dd/MM/yyyy")}`;
    }
    return `${format(from, "dd/MM/yyyy")} – ${format(to, "dd/MM/yyyy")}`;
  }
  if (from) return `A partir de ${format(from, "dd/MM/yyyy")}`;
  if (to) return `Até ${format(to, "dd/MM/yyyy")}`;
  return null;
}

/* ───────────────────────────── Dinheiro e clima ───────────────────────────── */

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 16000.27 → "R$ 16.000,27" */
export function formatBRL(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? BRL.format(value) : "—";
}

/**
 * "1 EUR = R$ 6,27" — moedas de valor baixo ganham mais casas: abaixo de R$ 0,01 usa 2 dígitos
 * significativos (0,00028 → "R$ 0,00028"), como o `label` do painel "Sobre o destino".
 */
export function formatExchange(
  currencyCode: string | null | undefined,
  rate: number | null | undefined,
): string {
  if (!currencyCode || typeof rate !== "number" || !Number.isFinite(rate)) return "—";
  if (currencyCode === "BRL") return formatBRL(1);
  const options: Intl.NumberFormatOptions =
    rate > 0 && rate < 0.01
      ? { maximumSignificantDigits: 2 }
      : { minimumFractionDigits: 2, maximumFractionDigits: rate < 0.1 ? 4 : 2 };
  const value = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", ...options }).format(
    rate,
  );
  return `1 ${currencyCode} = ${value}`;
}

/** (20, 20) → "≈ 20 °C" · (25, 30) → "≈ 25 a 30 °C" */
export function formatTemperature(min: number | null | undefined, max: number | null | undefined): string {
  const hasMin = typeof min === "number" && Number.isFinite(min);
  const hasMax = typeof max === "number" && Number.isFinite(max);
  if (!hasMin && !hasMax) return "—";
  const low = Math.round((hasMin ? min : max) as number);
  const high = Math.round((hasMax ? max : min) as number);
  return low === high ? `≈ ${low} °C` : `≈ ${Math.min(low, high)} a ${Math.max(low, high)} °C`;
}

/* ───────────────────────────── Rótulos ───────────────────────────── */

export const TRANSPORT_OPTIONS: ReadonlyArray<{ value: Transport; label: string }> = [
  { value: "aviao", label: "Avião" },
  { value: "carro", label: "Carro" },
  { value: "onibus", label: "Ônibus" },
];

export const COMPANION_OPTIONS: ReadonlyArray<{ value: Companions; label: string }> = [
  { value: "sozinho", label: "Sozinho" },
  { value: "casal", label: "Casal" },
  { value: "familia", label: "Família" },
  { value: "amigos", label: "Amigos" },
  { value: "trabalho", label: "Trabalho" },
];

export function transportLabel(value: Transport | null | undefined): string {
  return TRANSPORT_OPTIONS.find((o) => o.value === value)?.label ?? "—";
}

export function companionsLabel(value: Companions | null | undefined): string {
  return COMPANION_OPTIONS.find((o) => o.value === value)?.label ?? "—";
}
