import type { LucideIcon } from "lucide-react";
import {
  Home,
  Trees,
  Tractor,
  Package,
  ListChecks,
  Wrench,
  History,
  Apple,
  Bug,
  Fuel,
  HardHat,
  Users,
  User,
  Droplet,
  CloudRain,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", icon: Home },
  { href: "/talhoes", label: "Talhões", icon: Trees },
  { href: "/tratamentos", label: "Tratamentos", icon: Tractor },
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/atividades", label: "Atividades", icon: ListChecks },
  { href: "/maquinas", label: "Máquinas", icon: Wrench },
];

// Itens de gestão/escritório — exibidos só no menu lateral (desktop),
// fora da navegação inferior de lançamento rápido em campo.
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { href: "/historico-pomar", label: "Histórico do Pomar", icon: History },
  { href: "/contagem-frutos", label: "Contagem de Frutos", icon: Apple },
  // Aponta direto pra Planilha: o cadastro manual (Pontos/Armadilhas) ficou
  // pouco usado na prática e confundia quem só quer consultar a planilha —
  // as páginas de cadastro continuam existindo, só não estão mais no menu.
  { href: "/monitoramento-pragas/planilha", label: "Monitoramento de Pragas", icon: Bug },
  { href: "/diesel", label: "Controle de Diesel", icon: Droplet },
  { href: "/chuva", label: "Controle de Chuva", icon: CloudRain },
  { href: "/relatorios/horas-maquina", label: "Horas de Máquina", icon: Fuel },
  { href: "/relatorios/horas-homem", label: "Hora-Homem", icon: HardHat },
  { href: "/operadores", label: "Operadores", icon: Users },
  { href: "/usuarios", label: "Usuários", icon: User },
];
