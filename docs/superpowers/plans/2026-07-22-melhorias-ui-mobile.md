# Melhorias de UI Mobile (22/07/2026) — Plano de Implementação

> **Execução:** inline, nesta mesma conversa, em grupos pequenos. Sem subagent-driven-development.
> Cada grupo é implementado, verificado (`npx tsc --noEmit` + `npm run lint`, já que o projeto não
> tem suite de testes automatizada) e checado visualmente no navegador em larguras mobile (360px,
> 375px, 414px) e desktop (1280px), e só avança para o próximo grupo após confirmação do usuário.

**Objetivo:** corrigir 3 problemas pontuais de UI mobile — navegação inferior apertada/sem respiro
na safe area, overflow do botão "+ Manutenção" na tela de detalhe de Máquina, e falta de ícone na
previsão do tempo — introduzindo uma biblioteca de ícones consolidada (`lucide-react`) usada de forma
consistente nesses três pontos, **sem alterar nenhuma outra funcionalidade do sistema**.

**Arquitetura:** `lucide-react` substitui os emojis usados como ícone em `NAV_ITEMS` /
`SECONDARY_NAV_ITEMS` (fonte única de navegação, compartilhada entre `BottomNav`, `SideNav` e a
tela `/mais` — confirmado com o usuário que a atualização vale para os três). Um pequeno mapeador
de texto→ícone (`iconePorResumo`) traduz o campo livre `resumo` do INMET (ex: "Sol", "Chuvoso",
"Nublado") num ícone Lucide, sem alterar o texto exibido. O fix de overflow em Máquinas é só
CSS responsivo (flex-col no mobile, flex-row a partir de `sm:`), sem tocar em lógica.

**Tech Stack:** Next.js App Router, Tailwind, `lucide-react` (nova dependência).

## Global Constraints

- Não alterar nenhuma outra funcionalidade do sistema — só os 3 itens abaixo.
- Usar uma única biblioteca de ícones consolidada (`lucide-react`) nos 3 pontos pedidos
  (bottom nav, tela Mais, ícone do clima) — decisão já validada com o usuário de propagar também
  para o `SideNav` (desktop), já que ele consome o mesmo `NAV_ITEMS`/`SECONDARY_NAV_ITEMS`.
  Sem misturar bibliotecas de ícones diferentes.
- Painel de clima continua mostrando o texto do resumo (`p.resumo`) — o ícone é um complemento
  visual ao lado do texto, nunca um substituto.
- Sem suite de testes automatizada neste projeto — verificação por grupo = `npx tsc --noEmit` e
  `npm run lint`. Mudanças de layout exigem também checagem visual no navegador (dev server) em
  360px/375px/414px (mobile) e 1280px (desktop), sem regressão perceptível.
- Manter mobile-first: qualquer classe nova deve ser a base (mobile) com overrides em `sm:`/`md:`
  para desktop, nunca o contrário.
- Ícones novos usam `strokeWidth={1.75}` para casar visualmente com os ícones já desenhados à mão
  em `src/components/ui/icons.tsx` (que usam `strokeWidth="1.8"`, `viewBox 0 0 24 24`, `currentColor`).

---

## Grupo 1 — Dependência e ícones da navegação (bottom nav, tela Mais, side nav)

**Arquivos:**
- Modificar: `package.json` (adicionar `lucide-react`)
- Modificar: `src/lib/nav-items.ts` (troca `icon: string` por `icon: LucideIcon`)
- Modificar: `src/components/nav/bottom-nav.tsx` (renderiza `<item.icon>`, redesenha a barra)
- Modificar: `src/components/nav/side-nav.tsx` (renderiza `<item.icon>`)
- Modificar: `src/app/(app)/mais/page.tsx` (renderiza `<item.icon>`)
- Modificar: `src/app/layout.tsx` (`viewport.viewportFit = "cover"`, necessário para
  `env(safe-area-inset-bottom)` funcionar de verdade no iOS)
- Modificar: `src/components/nav/app-shell.tsx` (ajusta `pb-20` → `pb-24` no `<main>` para
  compensar a barra um pouco mais alta)

### Passo 1.1 — Instalar `lucide-react`

```bash
npm install lucide-react
```

### Passo 1.2 — Atualizar `src/lib/nav-items.ts`

Trocar o tipo do ícone de emoji (string) para componente Lucide, e escolher um ícone por item
mantendo o mesmo sentido semântico do emoji atual:

```typescript
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
  Fuel,
  HardHat,
  Users,
  User,
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
  { href: "/relatorios/horas-maquina", label: "Horas de Máquina", icon: Fuel },
  { href: "/relatorios/horas-homem", label: "Hora-Homem", icon: HardHat },
  { href: "/operadores", label: "Operadores", icon: Users },
  { href: "/usuarios", label: "Usuários", icon: User },
];
```

### Passo 1.3 — Redesenhar `src/components/nav/bottom-nav.tsx`

Substitui o emoji por `MoreHorizontal` no item "Mais", eleva a barra (safe area real + respiro
mínimo mesmo sem notch), aumenta levemente o espaçamento entre itens:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { NAV_ITEMS, type NavItem } from "@/lib/nav-items";

const ITEM_MAIS: NavItem = { href: "/mais", label: "Mais", icon: MoreHorizontal };

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden">
      {[...NAV_ITEMS, ITEM_MAIS].map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              active ? "text-green-700" : "text-neutral-500"
            }`}
          >
            <Icon className="h-6 w-6" strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

Pontos-chave da mudança:
- `pb-[max(0.75rem,env(safe-area-inset-bottom))]` garante respiro mínimo de 12px mesmo em
  aparelhos sem notch/home indicator (antes era `pb-[env(safe-area-inset-bottom)]`, que vira `0`
  nesses casos — daí a sensação de "espremido").
- `shadow-[0_-2px_10px_rgba(0,0,0,0.05)]` dá a sensação de barra "elevada" sobre o conteúdo.
- `py-2.5` (era `py-2`) e `gap-1` (era `gap-0.5`) dão mais respiro vertical entre ícone e label.
- Ícone Lucide 24px (`h-6 w-6`) no lugar do emoji, com `strokeWidth={1.75}` para casar com o
  restante dos ícones do app.

### Passo 1.4 — Atualizar `src/components/nav/side-nav.tsx`

Trocar `<span className="text-base">{item.icon}</span>` por:

```tsx
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
        active ? "bg-green-50 text-green-700" : "text-neutral-600 hover:bg-neutral-50"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={1.75} />
      {item.label}
    </Link>
  );
}
```

### Passo 1.5 — Atualizar `src/app/(app)/mais/page.tsx`

Trocar `<span className="text-base">{item.icon}</span>` por:

```tsx
import Link from "next/link";
import { SECONDARY_NAV_ITEMS } from "@/lib/nav-items";

export default function MaisPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Mais</h1>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {SECONDARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 text-sm font-medium text-neutral-900 last:border-b-0 hover:bg-neutral-50"
            >
              <Icon className="h-5 w-5 text-neutral-500" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

### Passo 1.6 — Habilitar safe area de verdade em `src/app/layout.tsx`

No `export const viewport: Viewport = { ... }`, adicionar `viewportFit: "cover"`:

```typescript
export const viewport: Viewport = {
  themeColor: "#2b6b42",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
```

Sem isso, `env(safe-area-inset-bottom)` sempre resolve para `0` no Safari/iOS — é por isso que a
barra fica colada na borda mesmo em iPhones com home indicator.

### Passo 1.7 — Ajustar respiro do conteúdo em `src/components/nav/app-shell.tsx`

A barra ficou um pouco mais alta (mais padding + safe area mínima). Trocar `pb-20` por `pb-24` no
`<main>` para o conteúdo não ficar escondido atrás dela em mobile (o `md:pb-6` do desktop não muda):

```tsx
<main className="flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-6">{children}</main>
```

### Passo 1.8 — Verificar

```bash
npx tsc --noEmit
npm run lint
npm run dev
```

Abrir no navegador em 375px de largura (Chrome DevTools, iPhone SE/12/13 preset): conferir que
os 7 itens da barra (Início, Talhões, Tratamentos, Estoque, Atividades, Máquinas, Mais) aparecem
com ícone Lucide, texto não corta, há respiro visível abaixo da barra até a borda da tela, e a
barra tem uma sombra sutil separando do conteúdo. Abrir `/mais` e conferir que os 6 itens também
usam ícone Lucide (não emoji). Em 1280px, conferir que o menu lateral (`SideNav`) também trocou
para ícones Lucide e não há regressão de layout.

### Passo 1.9 — Commit

```bash
git add package.json package-lock.json src/lib/nav-items.ts src/components/nav/bottom-nav.tsx src/components/nav/side-nav.tsx src/app/\(app\)/mais/page.tsx src/app/layout.tsx src/components/nav/app-shell.tsx
git commit -m "Substitui emojis por ícones Lucide na navegação e eleva a bottom nav"
```

---

## Grupo 2 — Overflow do botão "+ Manutenção" na tela de Máquina

**Arquivos:**
- Modificar: `src/app/(app)/maquinas/[id]/page.tsx:26-45`

**Diagnóstico:** o cabeçalho é `flex items-center justify-between gap-4` numa única linha, sempre.
À esquerda: foto (125px fixos) + nome da máquina (sem `min-w-0`/quebra). À direita: dois botões
`shrink-0` ("Editar" e "+ Manutenção") que também não quebram linha. Em telas de ~360-375px, com
um nome de máquina de tamanho normal, a soma ultrapassa a largura disponível e o botão
"+ Manutenção" fica cortado/fora da tela.

### Passo 2.1 — Ajustar o cabeçalho para empilhar no mobile

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex min-w-0 items-center gap-4">
    <FotoPrincipal maquinaId={maquina.id} fotoUrl={maquina.fotoUrl} nome={maquina.nome} />
    <h1 className="min-w-0 break-words text-xl font-semibold text-neutral-900">{maquina.nome}</h1>
  </div>
  <div className="flex gap-2 sm:shrink-0">
    <Link
      href={`/maquinas/${maquina.id}/editar`}
      className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-center text-sm font-medium text-neutral-700 sm:flex-none"
    >
      Editar
    </Link>
    <Link
      href={`/maquinas/${maquina.id}/manutencoes/nova`}
      className="flex-1 rounded-lg bg-green-700 px-4 py-2 text-center text-sm font-medium text-white active:bg-green-800 sm:flex-none"
    >
      + Manutenção
    </Link>
  </div>
</div>
```

No mobile (abaixo de `sm`), o bloco de botões vai para uma linha própria, ocupando a largura toda
e dividida igualmente entre os dois (`flex-1`) — sem overflow, sem scroll horizontal. A partir de
`sm:`, o layout volta a ser idêntico ao atual (linha única, botões lado a lado à direita): as
classes `sm:flex-row sm:items-center sm:justify-between` e `sm:flex-none` reproduzem exatamente o
comportamento que já existia em telas maiores, então não há mudança de desktop.

### Passo 2.2 — Verificar

```bash
npx tsc --noEmit
npm run lint
npm run dev
```

Abrir `/maquinas/<id>` de uma máquina com nome longo (ex: cadastrar temporariamente "Trator Valtra
BM 100 4x4" se não houver nenhuma assim) em 360px, 375px e 414px de largura: conferir que não há
scroll horizontal, os botões "Editar" e "+ Manutenção" aparecem inteiros, um do lado do outro,
ocupando a largura da tela. Em 1280px, conferir que o cabeçalho continua em uma única linha como
antes (fotos + nome à esquerda, botões à direita).

### Passo 2.3 — Commit

```bash
git add "src/app/(app)/maquinas/[id]/page.tsx"
git commit -m "Corrige overflow do botão + Manutenção no cabeçalho de Máquina no mobile"
```

---

## Grupo 3 — Ícone na previsão do tempo

**Arquivos:**
- Modificar: `src/lib/clima.ts` (adiciona `iconePorResumo`)
- Modificar: `src/components/clima/painel-clima.tsx` (renderiza o ícone ao lado do texto)

**Diagnóstico:** `clima.hoje/amanha.periodos[].resumo` e `clima.proximosDias[].resumo` são texto
livre vindo da API do INMET (ex: "Sol", "Sol com muitas nuvens", "Nublado", "Chuvoso", "Pancadas de
Chuva", "Trovoadas", "Nevoeiro"). Não existe um campo de "código de condição" estruturado — o
mapeamento precisa ser por palavra-chave no texto.

### Passo 3.1 — Adicionar mapeamento em `src/lib/clima.ts`

Adicionar ao final do arquivo (depois de `buscarClima`), junto com o import no topo:

```typescript
import type { LucideIcon } from "lucide-react";
import { CloudLightning, CloudRain, CloudFog, CloudSun, Cloud, Sun } from "lucide-react";

/**
 * Mapeia o texto livre do INMET (ex: "Sol", "Chuvoso", "Nublado com poucas nuvens") para um
 * ícone de condição. A ordem importa: condições mais específicas/severas são checadas antes
 * das genéricas (ex: "trovoada" antes de "chuva", "chuva" antes de "nuvens").
 */
export function iconePorResumo(resumo: string): LucideIcon {
  const texto = resumo.toLowerCase();

  if (texto.includes("trovoada") || texto.includes("tempestade")) return CloudLightning;
  if (texto.includes("chuv")) return CloudRain;
  if (texto.includes("nevoeiro") || texto.includes("neblina") || texto.includes("bruma")) return CloudFog;
  if (texto.includes("sol") && (texto.includes("nuvens") || texto.includes("nublado"))) return CloudSun;
  if (texto.includes("nublado") || texto.includes("encoberto") || texto.includes("nuvens")) return Cloud;
  if (texto.includes("sol")) return Sun;

  return Cloud;
}
```

### Passo 3.2 — Renderizar o ícone em `src/components/clima/painel-clima.tsx`

Importar `iconePorResumo` e trocar o `<span>{p.resumo}</span>` do período (dentro de `BlocoDia`)
para incluir o ícone antes do texto, mantendo o texto:

```tsx
import type { Clima, DiaDetalhado } from "@/lib/clima";
import { iconePorResumo } from "@/lib/clima";
```

Dentro de `BlocoDia`, no bloco de cada período:

```tsx
{dia.periodos.map((p) => {
  const Icone = iconePorResumo(p.resumo);
  return (
    <div key={p.nome} className="flex flex-col gap-1 rounded-lg bg-[#212a27] p-3">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#8fa398]">
        {p.nome}
      </span>
      <div className="flex items-center gap-1.5">
        <Icone className="h-4 w-4 shrink-0 text-[#8fa398]" strokeWidth={1.75} />
        <span className="text-[11px] leading-snug">{p.resumo}</span>
      </div>
    </div>
  );
})}
```

E no resumo dos "Próximos dias" (no componente `PainelClima`), mesma ideia:

```tsx
{clima.proximosDias.map((dia) => {
  const Icone = iconePorResumo(dia.resumo);
  return (
    <div key={dia.data} className="flex flex-col gap-0.5 rounded-lg bg-[#212a27] p-3">
      <span className="text-[11px] font-bold uppercase tracking-wide text-[#8fa398]">
        {dia.diaSemana.replace("-Feira", "").slice(0, 3)}
      </span>
      <Icone className="h-4 w-4 text-[#8fa398]" strokeWidth={1.75} />
      <span className="text-lg font-bold tabular-nums">
        {dia.temperaturaMaxima}° <span className="text-sm font-normal text-[#8fa398]">{dia.temperaturaMinima}°</span>
      </span>
    </div>
  );
})}
```

Atualizar também o comentário de topo do arquivo (`/** Painel de campo: ... Só texto — sem
ícones/emoji ... */`), que hoje descreve explicitamente "sem ícones" — isso deixou de ser verdade:

```typescript
/**
 * Painel de campo: previsão de temperatura oficial do INMET (Manhã/Tarde/Noite
 * para hoje e amanhã, resumo diário para os dias seguintes). Cada período mostra
 * o texto do resumo do INMET acompanhado de um ícone de condição (sol, nuvem,
 * chuva etc. — ver iconePorResumo em src/lib/clima.ts). Fundo sempre escuro de
 * propósito (mostrador de instrumento), independente do resto do app, que é
 * claro — por isso usa cores fixas via classes arbitrárias do Tailwind, em vez
 * da paleta clara do resto do sistema.
 */
```

### Passo 3.3 — Verificar

```bash
npx tsc --noEmit
npm run lint
npm run dev
```

Abrir a Home em mobile (375px) e desktop (1280px): conferir que cada período (Manhã/Tarde/Noite)
de Hoje/Amanhã mostra um ícone pequeno ao lado do texto do resumo, e que os "Próximos dias" também
mostram o ícone. Testar visualmente (ou temporariamente forçar valores de teste no componente) que
"Sol" → sol, "Nublado" → nuvem, "Chuvoso"/"Pancadas de Chuva" → nuvem com chuva, "Trovoadas" → raio,
"Nevoeiro" → névoa, "Sol com algumas nuvens" → sol entre nuvens. Conferir que o texto do resumo
continua sendo exibido igual a antes (o ícone é aditivo).

### Passo 3.4 — Commit

```bash
git add src/lib/clima.ts src/components/clima/painel-clima.tsx
git commit -m "Adiciona ícone de condição climática ao lado do texto na previsão do tempo"
```

---

## Grupo 4 — Revisão final de regressão mobile

Depois dos 3 grupos acima, com o dev server rodando, revisar em 360px/375px/414px (mobile) e
1280px (desktop):

- [ ] Bottom nav: 7 itens com ícone Lucide, sem aperto visual, barra com respiro/sombra na base,
      ativo em verde (`text-green-700`), sem regressão nas rotas existentes.
- [ ] Tela `/mais`: 6 itens com ícone Lucide (não emoji), lista intacta.
- [ ] `SideNav` (desktop): mesmos ícones Lucide, sem quebra de layout do menu lateral.
- [ ] `/maquinas/<id>`: cabeçalho sem overflow em nenhuma das 3 larguras mobile testadas; em
      desktop, cabeçalho igual ao que era antes (uma linha só).
- [ ] Lista `/maquinas` (não deveria ter mudado): conferir que continua igual.
- [ ] Home: painel de clima com ícones ao lado do texto, em mobile e desktop, sem quebra de layout
      no grid de "Próximos dias".
- [ ] Navegar por pelo menos 3 outras telas do app (ex: Talhões, Estoque, Atividades) só para
      confirmar que nada mais mudou visualmente (o objetivo é zero regressão fora do escopo).

Rodar por último, no repositório inteiro:

```bash
npx tsc --noEmit
npm run lint
npm run build
```
