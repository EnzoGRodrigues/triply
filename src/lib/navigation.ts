/**
 * Navegação completa (recarrega a página) — usada em login, cadastro, logout e 401.
 *
 * - Com Cache Components o Next mantém rotas anteriores "vivas" em segundo plano; ao trocar de
 *   usuário isso deixaria dados do usuário antigo na memória. Recarregar descarta tudo e ainda
 *   garante que o proxy enxergue o cookie de sessão novo (ou a ausência dele).
 * - `replace` (e não `assign`) troca a entrada atual do histórico: depois do logout o botão
 *   "Voltar" do navegador não leva de volta a uma página autenticada.
 */
export function hardNavigate(url: string): void {
  if (typeof window !== "undefined") window.location.replace(url);
}
