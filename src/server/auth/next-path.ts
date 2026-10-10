/**
 * Valida o parâmetro `?next=` (para onde voltar depois do login).
 * Só aceita caminhos internos da própria aplicação ("/planos/novo?x=1"); recusa
 * URLs absolutas, "//host", "/\\host", caracteres de controle e espaços — o que
 * evitaria um redirecionamento aberto (open redirect) para outro site.
 * Módulo puro (sem Node/DB): pode ser usado no proxy e também no front.
 */

const BASE = "http://triply.local";
const MAX_LENGTH = 2048;

/** Retorna o caminho normalizado (`/x?y#z`) ou `null` se não for seguro. */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || value.length > MAX_LENGTH) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  // Controle, espaço e barra invertida: o parser de URL os trata como "/" (ex.: "/\\evil.com").
  if (/[\u0000- \u007f\\]/.test(value)) return null;

  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE || url.pathname.startsWith("//")) return null;

  return url.pathname + url.search + url.hash;
}
