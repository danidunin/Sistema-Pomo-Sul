export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", icon: "🏠" },
  { href: "/talhoes", label: "Talhões", icon: "🌳" },
  { href: "/operacoes", label: "Operações", icon: "🚜" },
  { href: "/estoque", label: "Estoque", icon: "📦" },
  { href: "/atividades", label: "Atividades", icon: "🕒" },
  { href: "/maquinas", label: "Máquinas", icon: "🔧" },
];

// Itens de gestão/escritório — exibidos só no menu lateral (desktop),
// fora da navegação inferior de lançamento rápido em campo.
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { href: "/usuarios", label: "Usuários", icon: "👤" },
];
