export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", icon: "🏠" },
  { href: "/talhoes", label: "Talhões", icon: "🌳" },
  { href: "/tratamentos", label: "Tratamentos", icon: "🚜" },
  { href: "/estoque", label: "Estoque", icon: "📦" },
  { href: "/atividades", label: "Atividades", icon: "🕒" },
  { href: "/maquinas", label: "Máquinas", icon: "🔧" },
];

// Itens de gestão/escritório — exibidos só no menu lateral (desktop),
// fora da navegação inferior de lançamento rápido em campo.
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { href: "/historico-pomar", label: "Histórico do Pomar", icon: "📜" },
  { href: "/contagem-frutos", label: "Contagem de Frutos", icon: "🍎" },
  { href: "/relatorios/horas-maquina", label: "Horas de Máquina", icon: "⛽" },
  { href: "/relatorios/horas-homem", label: "Hora-Homem", icon: "👷" },
  { href: "/operadores", label: "Operadores", icon: "🧑‍🌾" },
  { href: "/usuarios", label: "Usuários", icon: "👤" },
];
