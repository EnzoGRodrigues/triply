import { Map, NotebookPen, UserRound, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Rótulo curto da barra inferior (celular). */
  shortLabel: string;
  icon: LucideIcon;
  /** Prefixos de rota que marcam o item como ativo. */
  match: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/perfil", label: "Meu perfil", shortLabel: "Perfil", icon: UserRound, match: ["/perfil", "/viagens"] },
  { href: "/planos", label: "Planos de viagem", shortLabel: "Planos", icon: Map, match: ["/planos"] },
  { href: "/registrar", label: "Registrar viagem", shortLabel: "Registrar", icon: NotebookPen, match: ["/registrar"] },
];

export function isActive(item: NavItem, pathname: string): boolean {
  return item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
