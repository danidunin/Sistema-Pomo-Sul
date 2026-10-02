# Nova identidade visual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blurry aerial hero photo with the user's own orchard photo, extract the repeated Card/Button/Badge Tailwind patterns into reusable components, migrate every screen to use them, and put the official logo in the side nav instead of plain text.

**Architecture:** Three new presentational components in `src/components/ui/` (`Card`, `Button`, a `badgeClassName` helper) with zero new logic or state. The hero photo is a drop-in asset swap (already produced and committed). Migration is a mechanical search-and-replace of Tailwind class strings for existing JSX elements — no behavior, data flow, or test coverage changes anywhere.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript. No new dependencies.

## Global Constraints

- Source spec: `docs/superpowers/specs/2026-10-02-identidade-visual-design.md`.
- Out of scope (per spec): color palette, typography, screen layout/flow, new features. Do not touch anything beyond class strings on the targeted elements.
- No new automated tests for `Card`/`Button`/badge — they are purely presentational and the spec explicitly says so. The project's vitest setup (`vitest.config.ts`) has no React/jsdom testing libraries installed; do not add them for this work. Verification is `npm run lint`, `npm run build`, and a manual visual check in the browser preview.
- Every migration step must preserve 100% of existing behavior: `type="submit"`/`type="button"`, `disabled`, `onClick`, `href`, any extra Tailwind classes beyond the base pattern (layout classes like `col-span-2`, `flex-1`, `w-fit`, `sm:flex-none`, `whitespace-nowrap`, etc.) — these all move into the component's `className` prop unchanged.
- Danger/destructive buttons (red: `bg-red-600`, `border-red-200 text-red-600`) are **not** in scope for the `Button` component (spec only defines `primary`/`secondary` — green/neutral). Leave red buttons exactly as they are.
- Commit after each task.

---

### Task 1: Hero photo swap (login + dashboard)

**Files:**
- Modify: `src/app/(auth)/login/page.tsx:12-19`
- Modify: `src/app/(app)/page.tsx:20-27`
- Delete: `public/images/hero-fazenda.jpg`

**Interfaces:** None — this task has no dependents and depends on nothing else in this plan.

The final cropped photo is already committed at `public/images/hero-pomar.jpg` (produced and approved during brainstorming — see spec section 1). This task only swaps the reference and the object-position.

- [ ] **Step 1: Swap the image source in the login page**

In `src/app/(auth)/login/page.tsx`, change:

```tsx
        <Image
          src="/images/hero-fazenda.jpg"
          alt="Vista aérea da propriedade Pomo Sul"
          fill
          priority
          className="object-cover [object-position:50%_75%]"
        />
```

to:

```tsx
        <Image
          src="/images/hero-pomar.jpg"
          alt="Macieiras carregadas de frutos no pomar Pomo Sul"
          fill
          priority
          className="object-cover [object-position:50%_50%]"
        />
```

- [ ] **Step 2: Swap the image source in the dashboard**

In `src/app/(app)/page.tsx`, change:

```tsx
        <Image
          src="/images/hero-fazenda.jpg"
          alt="Vista aérea da propriedade Pomo Sul"
          fill
          priority
          className="object-cover [object-position:50%_75%]"
        />
```

to:

```tsx
        <Image
          src="/images/hero-pomar.jpg"
          alt="Macieiras carregadas de frutos no pomar Pomo Sul"
          fill
          priority
          className="object-cover [object-position:50%_50%]"
        />
```

- [ ] **Step 3: Remove the old photo**

```bash
git rm "public/images/hero-fazenda.jpg"
```

- [ ] **Step 4: Verify no remaining references**

```bash
grep -rn "hero-fazenda" src public
```

Expected: no output.

- [ ] **Step 5: Visual check**

Start the dev server (`pomo-sul-dev` in `.claude/launch.json`), open `/login` and `/` (dashboard, logged in) at 375px and 1440px widths. Confirm: the new photo shows, apples are the visual focus, the white text ("Entrar" area is unaffected; on the hero itself check "Sistema de Gestão Operacional" / "Bem-vindo(a) de volta") stays legible against the gradient.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: troca a foto de destaque do login e do dashboard"
```

---

### Task 2: `Card` component

**Files:**
- Create: `src/components/ui/card.tsx`

**Interfaces:**
- Produces: `Card` — `function Card(props: React.HTMLAttributes<HTMLDivElement> & { padding?: "none" | "sm" | "md" | "lg" })`. Renders a `<div>`. Default `padding` is `"md"` (`p-4`, matching today's most common case). `className` passed in is appended after the component's own classes, so callers can add layout classes (`col-span-2`, `overflow-hidden`, `active:bg-neutral-50`, etc.) or override `padding`'s visual effect with their own spacing class if truly needed.
- Consumed by: every task from Task 5 onward.

- [ ] **Step 1: Create the component**

```tsx
import type { HTMLAttributes } from "react";

type CardPadding = "none" | "sm" | "md" | "lg";

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: CardPadding;
};

export function Card({ padding = "md", className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white shadow-sm ${PADDING_CLASSES[padding]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors referencing `card.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/card.tsx
git commit -m "feat: adiciona componente Card"
```

---

### Task 3: `Button` component

**Files:**
- Create: `src/components/ui/button.tsx`

**Interfaces:**
- Produces: `Button` — `function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary"; size?: "sm" | "md" | "lg" })`. Renders a `<button>`. Default `variant` is `"primary"`, default `size` is `"md"`. All native button props (`type`, `disabled`, `onClick`, `form`, etc.) pass through via `...rest`.
- Size mapping (matches existing usages): `sm` = `px-3 py-2 text-xs` (today's rare small/icon-adjacent buttons), `md` = `px-4 py-2 text-sm` (the default, most common case today), `lg` = `w-full py-3 text-base` (full-width form submit buttons like the login button).
- Consumed by: every task from Task 6 onward.

- [ ] **Step 1: Create the component**

```tsx
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-green-700 text-white active:bg-green-800",
  secondary: "border border-neutral-300 text-neutral-700 active:bg-neutral-50",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "w-full py-3 text-base",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant = "primary", size = "md", className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      className={`rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/50 focus-visible:ring-offset-1 disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors referencing `button.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat: adiciona componente Button"
```

---

### Task 4: Badge helper + side-nav logo

**Files:**
- Create: `src/components/ui/badge.ts`
- Modify: `src/components/nav/app-shell.tsx:20-30`
- Modify: `src/components/nav/side-nav.tsx:1-29`

**Interfaces:**
- Produces: `badgeClassName(color?: "green" | "neutral") => string`. A plain function, not a component — the one real call site (`app-shell.tsx`) styles a `next/link` `<Link>`, not a `<div>`/`<span>`, so a wrapper component would force an awkward polymorphic `as` prop for a single usage. A className-returning helper centralizes the style (the spec's actual goal) without that mismatch. `CulturaTag` (`src/components/ui/cultura-tag.tsx`) and `StatusPragaBadge` (`src/components/pragas/status-praga-badge.tsx`) already encapsulate their own per-value color logic and are intentionally left untouched — forcing them through a 2-color helper would remove information (which culture/status), not simplify anything.
- No other task depends on this one.

- [ ] **Step 1: Create the badge helper**

```ts
type BadgeColor = "green" | "neutral";

const COLOR_CLASSES: Record<BadgeColor, string> = {
  green: "bg-green-50 text-green-700",
  neutral: "bg-neutral-100 text-neutral-600",
};

export function badgeClassName(color: BadgeColor = "green"): string {
  return `rounded-full px-3 py-1 text-xs font-medium ${COLOR_CLASSES[color]}`;
}
```

- [ ] **Step 2: Use it in the app header pill**

In `src/components/nav/app-shell.tsx`, add the import:

```tsx
import { badgeClassName } from "@/components/ui/badge";
```

Then change:

```tsx
              <Link
                href="/"
                className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
              >
                {propriedadeNome}
              </Link>
```

to:

```tsx
              <Link href="/" className={badgeClassName("green")}>
                {propriedadeNome}
              </Link>
```

- [ ] **Step 3: Replace the side-nav text wordmark with the logo**

In `src/components/nav/side-nav.tsx`, add the import:

```tsx
import Image from "next/image";
```

Then change:

```tsx
      <div className="mb-6 px-2 text-lg font-semibold text-neutral-900">POMO SUL</div>
```

to:

```tsx
      <div className="mb-6 px-2">
        <Image
          src="/images/logo-pomosul-transparente.png"
          alt="Pomo Sul"
          width={1000}
          height={692}
          className="h-8 w-auto"
        />
      </div>
```

- [ ] **Step 4: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: no new errors.

- [ ] **Step 5: Visual check**

Open any logged-in page at desktop width (≥768px, so the side nav is visible). Confirm the logo renders at the top of the side nav instead of the "POMO SUL" text, sized reasonably (~32px tall) and not distorted. Confirm the property-name pill in the header still looks identical to before (same green pill).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/badge.ts src/components/nav/app-shell.tsx src/components/nav/side-nav.tsx
git commit -m "feat: usa a logo no menu lateral e centraliza o estilo de badge"
```

---

### Task 5: Migrate `Card` — batch 1 (`src/app/(app)` pages, part 1)

**Files:**
- Modify: `src/app/(app)/atividades/[id]/page.tsx`
- Modify: `src/app/(app)/atividades/page.tsx`
- Modify: `src/app/(app)/chuva/page.tsx`
- Modify: `src/app/(app)/contagem-frutos/page.tsx`
- Modify: `src/app/(app)/contagem-frutos/quadra/[talhaoId]/page.tsx`
- Modify: `src/app/(app)/diesel/page.tsx`
- Modify: `src/app/(app)/estoque/page.tsx`
- Modify: `src/app/(app)/mais/page.tsx`

**Interfaces:**
- Consumes: `Card` from `src/components/ui/card.tsx` (Task 2) — `<Card padding="..." className="...">`.

This is a mechanical transformation applied to every element in these 8 files whose `className` contains the base pattern `rounded-xl border border-neutral-200 bg-white`.

**The rule:**
1. Add `import { Card } from "@/components/ui/card";` to the file (if not already present).
2. For each matching element, replace the tag (`div`, usually) with `Card`.
3. Figure out the padding: if the original classes include `p-4` (or no explicit padding at all beyond the base pattern, since `p-4` is the overwhelmingly common case here), use the default — just omit the `padding` prop. If `p-3`, pass `padding="sm"`. If `p-6`, pass `padding="lg"`. If no padding class at all (e.g. `overflow-hidden rounded-xl border border-neutral-200 bg-white` with no `p-*`), pass `padding="none"`.
4. Move every other class on that element (anything that isn't `rounded-xl`, `border`, `border-neutral-200`, `bg-white`, or the padding class you just mapped) into `className` on the `Card`, in the same order they appeared.
5. Change the matching closing `</div>` to `</Card>`.

**Worked example** (from `src/app/(app)/page.tsx`'s `Cartao` helper — same pattern, for reference only, that specific file is migrated in Task 6):

Before:
```tsx
    <div
      className={`flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-4 ${
        spanDuasColunas ? "col-span-2" : ""
      }`}
    >
```

After:
```tsx
    <Card
      padding="none"
      className={`flex flex-col gap-1 p-4 ${
        spanDuasColunas ? "col-span-2" : ""
      }`}
    >
```

(Here `padding="none"` plus keeping `p-4` inside the dynamic `className` string was simpler and equally correct than trying to extract `p-4` out of a template literal — when the padding class is embedded in a conditional/dynamic class string, leave it where it is and just set `padding="none"` on the component so it isn't duplicated.)

- [ ] **Step 1: Find every occurrence in this batch**

```bash
grep -n "rounded-xl border border-neutral-200 bg-white" \
  "src/app/(app)/atividades/[id]/page.tsx" \
  "src/app/(app)/atividades/page.tsx" \
  "src/app/(app)/chuva/page.tsx" \
  "src/app/(app)/contagem-frutos/page.tsx" \
  "src/app/(app)/contagem-frutos/quadra/[talhaoId]/page.tsx" \
  "src/app/(app)/diesel/page.tsx" \
  "src/app/(app)/estoque/page.tsx" \
  "src/app/(app)/mais/page.tsx"
```

- [ ] **Step 2: Apply the rule to every match from Step 1**, using the worked example above as the template. Add the `Card` import to each file you touch.

- [ ] **Step 3: Verify no pattern remains**

```bash
grep -rn "rounded-xl border border-neutral-200 bg-white" \
  "src/app/(app)/atividades/[id]/page.tsx" \
  "src/app/(app)/atividades/page.tsx" \
  "src/app/(app)/chuva/page.tsx" \
  "src/app/(app)/contagem-frutos/page.tsx" \
  "src/app/(app)/contagem-frutos/quadra/[talhaoId]/page.tsx" \
  "src/app/(app)/diesel/page.tsx" \
  "src/app/(app)/estoque/page.tsx" \
  "src/app/(app)/mais/page.tsx"
```

Expected: no output.

- [ ] **Step 4: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: no new errors.

- [ ] **Step 5: Visual check**

Open `/atividades`, `/chuva`, `/diesel`, `/estoque`, and `/mais` in the browser preview (375px and 1024px). Confirm every card still looks the same shape/spacing as before, now with a subtle shadow.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/atividades" "src/app/(app)/chuva" "src/app/(app)/contagem-frutos" "src/app/(app)/diesel" "src/app/(app)/estoque" "src/app/(app)/mais"
git commit -m "refactor: usa Card em atividades, chuva, contagem-frutos, diesel, estoque e mais"
```

---

### Task 6: Migrate `Card` — batch 2 (`src/app/(app)` pages, part 2)

**Files:**
- Modify: `src/app/(app)/maquinas/[id]/page.tsx`
- Modify: `src/app/(app)/maquinas/page.tsx`
- Modify: `src/app/(app)/monitoramento-pragas/armadilhas/page.tsx`
- Modify: `src/app/(app)/monitoramento-pragas/pontos/[id]/page.tsx`
- Modify: `src/app/(app)/monitoramento-pragas/pontos/page.tsx`
- Modify: `src/app/(app)/operadores/[id]/page.tsx`
- Modify: `src/app/(app)/operadores/page.tsx`
- Modify: `src/app/(app)/page.tsx`

**Interfaces:**
- Consumes: `Card` from `src/components/ui/card.tsx` (Task 2).

Same rule as Task 5. `src/app/(app)/page.tsx` has two extra cases worth calling out explicitly:

**Case A — the clickable property-selector card** (in `SeletorPropriedade`): has `active:bg-neutral-50` and `text-left` alongside the base pattern, and `p-5` instead of `p-4`:

Before:
```tsx
              <button
                type="submit"
                className="flex w-full flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-5 text-left active:bg-neutral-50"
              >
```

This one stays a `<button>` (it's a real submit button, not a layout container) — do **not** wrap it in `Card`. Leave it exactly as-is; it's borderline the Card pattern but is functionally a button and `padding="lg"` (`p-6`) wouldn't match the hand-picked `p-5`. Out of scope for this migration.

**Case B — the `Cartao` helper component** (used for the dashboard stat tiles): see the worked example already given in Task 5 — apply that exact transformation here.

- [ ] **Step 1: Find every occurrence in this batch**

```bash
grep -n "rounded-xl border border-neutral-200 bg-white" \
  "src/app/(app)/maquinas/[id]/page.tsx" \
  "src/app/(app)/maquinas/page.tsx" \
  "src/app/(app)/monitoramento-pragas/armadilhas/page.tsx" \
  "src/app/(app)/monitoramento-pragas/pontos/[id]/page.tsx" \
  "src/app/(app)/monitoramento-pragas/pontos/page.tsx" \
  "src/app/(app)/operadores/[id]/page.tsx" \
  "src/app/(app)/operadores/page.tsx" \
  "src/app/(app)/page.tsx"
```

- [ ] **Step 2: Apply the rule to every match**, except the clickable property-selector `<button>` described in Case A above (leave that one untouched). Add the `Card` import to each file you touch.

- [ ] **Step 3: Verify**

```bash
grep -n "rounded-xl border border-neutral-200 bg-white" "src/app/(app)/page.tsx"
```

Expected: exactly one remaining match — the property-selector `<button>` from Case A.

```bash
grep -n "rounded-xl border border-neutral-200 bg-white" \
  "src/app/(app)/maquinas/[id]/page.tsx" \
  "src/app/(app)/maquinas/page.tsx" \
  "src/app/(app)/monitoramento-pragas/armadilhas/page.tsx" \
  "src/app/(app)/monitoramento-pragas/pontos/[id]/page.tsx" \
  "src/app/(app)/monitoramento-pragas/pontos/page.tsx" \
  "src/app/(app)/operadores/[id]/page.tsx" \
  "src/app/(app)/operadores/page.tsx"
```

Expected: no output.

- [ ] **Step 4: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 5: Visual check**

Open `/maquinas`, `/monitoramento-pragas/armadilhas`, `/operadores`, and `/` (dashboard, both with and without a property selected) at 375px and 1024px. Confirm cards look right and the property-selector button is unchanged.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/maquinas" "src/app/(app)/monitoramento-pragas" "src/app/(app)/operadores" "src/app/(app)/page.tsx"
git commit -m "refactor: usa Card em maquinas, monitoramento de pragas, operadores e dashboard"
```

---

### Task 7: Migrate `Card` — batch 3 (`src/app/(app)` pages, part 3)

**Files:**
- Modify: `src/app/(app)/relatorios/horas-homem/page.tsx`
- Modify: `src/app/(app)/relatorios/horas-maquina/page.tsx`
- Modify: `src/app/(app)/talhoes/[id]/page.tsx`
- Modify: `src/app/(app)/talhoes/page.tsx`
- Modify: `src/app/(app)/tratamentos/[id]/page.tsx`
- Modify: `src/app/(app)/tratamentos/page.tsx`
- Modify: `src/app/(app)/tratamentos/resumo/page.tsx`
- Modify: `src/app/(app)/usuarios/page.tsx`

**Interfaces:**
- Consumes: `Card` from `src/components/ui/card.tsx` (Task 2).

Same rule as Task 5. Note `src/app/(app)/talhoes/page.tsx` has a no-padding, `overflow-hidden` case:

Before:
```tsx
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
```

After:
```tsx
        <Card padding="none" className="overflow-hidden">
```

- [ ] **Step 1: Find every occurrence in this batch**

```bash
grep -n "rounded-xl border border-neutral-200 bg-white" \
  "src/app/(app)/relatorios/horas-homem/page.tsx" \
  "src/app/(app)/relatorios/horas-maquina/page.tsx" \
  "src/app/(app)/talhoes/[id]/page.tsx" \
  "src/app/(app)/talhoes/page.tsx" \
  "src/app/(app)/tratamentos/[id]/page.tsx" \
  "src/app/(app)/tratamentos/page.tsx" \
  "src/app/(app)/tratamentos/resumo/page.tsx" \
  "src/app/(app)/usuarios/page.tsx"
```

- [ ] **Step 2: Apply the rule to every match from Step 1.** Add the `Card` import to each file you touch.

- [ ] **Step 3: Verify no pattern remains**

```bash
grep -rn "rounded-xl border border-neutral-200 bg-white" \
  "src/app/(app)/relatorios/horas-homem/page.tsx" \
  "src/app/(app)/relatorios/horas-maquina/page.tsx" \
  "src/app/(app)/talhoes/[id]/page.tsx" \
  "src/app/(app)/talhoes/page.tsx" \
  "src/app/(app)/tratamentos/[id]/page.tsx" \
  "src/app/(app)/tratamentos/page.tsx" \
  "src/app/(app)/tratamentos/resumo/page.tsx" \
  "src/app/(app)/usuarios/page.tsx"
```

Expected: no output.

- [ ] **Step 4: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 5: Visual check**

Open `/relatorios/horas-homem`, `/talhoes`, `/tratamentos`, and `/usuarios` at 375px and 1024px. Confirm cards and the talhões table container look right.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/relatorios" "src/app/(app)/talhoes" "src/app/(app)/tratamentos" "src/app/(app)/usuarios"
git commit -m "refactor: usa Card em relatorios, talhoes, tratamentos e usuarios"
```

---

### Task 8: Migrate `Card` — batch 4 (components)

**Files:**
- Modify: `src/components/clima/painel-clima.tsx`
- Modify: `src/components/historico/timeline.tsx`
- Modify: `src/components/maquinas/historico-manutencao.tsx`
- Modify: `src/components/maquinas/historico-revisoes.tsx`
- Modify: `src/components/pragas/grade-excel.tsx`
- Modify: `src/components/pragas/grade-leituras-form.tsx`
- Modify: `src/components/pragas/planilha-tabela.tsx`
- Modify: `src/components/usuarios/novo-usuario-form.tsx`

**Interfaces:**
- Consumes: `Card` from `src/components/ui/card.tsx` (Task 2).

Same rule as Task 5. `src/components/historico/timeline.tsx` is the same no-padding `overflow-hidden` shape as the Task 7 example:

Before:
```tsx
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
```

After:
```tsx
    <Card padding="none" className="overflow-hidden">
```

- [ ] **Step 1: Find every occurrence in this batch**

```bash
grep -n "rounded-xl border border-neutral-200 bg-white" \
  src/components/clima/painel-clima.tsx \
  src/components/historico/timeline.tsx \
  src/components/maquinas/historico-manutencao.tsx \
  src/components/maquinas/historico-revisoes.tsx \
  src/components/pragas/grade-excel.tsx \
  src/components/pragas/grade-leituras-form.tsx \
  src/components/pragas/planilha-tabela.tsx \
  src/components/usuarios/novo-usuario-form.tsx
```

- [ ] **Step 2: Apply the rule to every match from Step 1.** Add the `Card` import to each file you touch.

- [ ] **Step 3: Verify no pattern remains**

```bash
grep -rn "rounded-xl border border-neutral-200 bg-white" \
  src/components/clima/painel-clima.tsx \
  src/components/historico/timeline.tsx \
  src/components/maquinas/historico-manutencao.tsx \
  src/components/maquinas/historico-revisoes.tsx \
  src/components/pragas/grade-excel.tsx \
  src/components/pragas/grade-leituras-form.tsx \
  src/components/pragas/planilha-tabela.tsx \
  src/components/usuarios/novo-usuario-form.tsx
```

Expected: no output.

- [ ] **Step 4: Confirm this was the last batch**

```bash
grep -rln "rounded-xl border border-neutral-200 bg-white" src
```

Expected: only `src/app/(app)/page.tsx` (the Case-A property-selector button from Task 6, intentionally left as-is).

- [ ] **Step 5: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 6: Visual check**

Open the dashboard (for `painel-clima`), a talhão's history page (for `timeline`), a máquina's detail page (for `historico-manutencao`/`historico-revisoes`), a ponto de monitoramento's grade (for `grade-excel`/`grade-leituras-form`), and `/usuarios/novo` at 375px and 1024px.

- [ ] **Step 7: Commit**

```bash
git add src/components/clima src/components/historico/timeline.tsx src/components/maquinas/historico-manutencao.tsx src/components/maquinas/historico-revisoes.tsx src/components/pragas/grade-excel.tsx src/components/pragas/grade-leituras-form.tsx src/components/pragas/planilha-tabela.tsx src/components/usuarios/novo-usuario-form.tsx
git commit -m "refactor: usa Card nos componentes restantes (clima, historico, maquinas, pragas, usuarios)"
```

---

### Task 9: Migrate `Button` — batch 1

**Files:**
- Modify: `src/app/(app)/atividades/[id]/page.tsx`
- Modify: `src/app/(app)/atividades/page.tsx`
- Modify: `src/app/(app)/chuva/page.tsx`
- Modify: `src/app/(app)/contagem-frutos/page.tsx`
- Modify: `src/app/(app)/contagem-frutos/quadra/[talhaoId]/page.tsx`
- Modify: `src/app/(app)/diesel/page.tsx`
- Modify: `src/app/(app)/estoque/page.tsx`
- Modify: `src/app/(app)/estoque/produtos/[id]/editar/page.tsx`
- Modify: `src/app/(app)/historico-pomar/page.tsx`

**Interfaces:**
- Consumes: `Button` from `src/components/ui/button.tsx` (Task 3) — `<Button variant="..." size="...">`.

**The rule:**
1. Add `import { Button } from "@/components/ui/button";` to the file (if not already present).
2. For a **primary** button (`rounded-lg bg-green-700 ...`): replace the tag with `Button`, do not pass `variant` (primary is the default). Map size: `py-3` full-width form submit → `size="lg"`, `px-4 py-2 text-sm` → omit `size` (md is default), `px-3 py-2 text-xs` → `size="sm"`.
3. For a **secondary** button (`rounded-lg border border-neutral-300 ...`): replace the tag with `Button variant="secondary"`, same size mapping.
4. Move every other class (anything beyond `rounded-lg`, the variant's base classes, the size's padding/text classes, and `font-medium`) into `className`.
5. **Skip red/danger buttons** (`bg-red-600`, `border-red-200 text-red-600`) — out of scope, leave untouched.

**Worked example** (from `src/app/(auth)/login/page.tsx`, migrated in Task 11 — shown here as the reference template since it's the clearest `size="lg"` case):

Before:
```tsx
            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full rounded-lg bg-green-700 py-3 text-base font-medium text-white active:bg-green-800 disabled:opacity-60"
            >
              {rotulo("Entrar", "Entrando...")}
            </button>
```

After:
```tsx
            <Button type="submit" disabled={isPending} size="lg" className="mt-2">
              {rotulo("Entrar", "Entrando...")}
            </Button>
```

(`disabled:opacity-60` is dropped from `className` because `Button` already applies it by default.)

A **medium, inline** primary button example (typical "add new" button pattern seen across list pages):

Before:
```tsx
        <Link
          href="/atividades/nova"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          Nova atividade
        </Link>
```

This is a `Link`, not a `button` — `Button`'s props type is `ButtonHTMLAttributes<HTMLButtonElement>`, so it cannot be used on a `Link`. **Leave `Link`-based "buttons" as plain Tailwind** (do not force them through `Button`); only convert actual `<button>` elements. This applies throughout every batch in Tasks 9–14.

- [ ] **Step 1: Find every occurrence in this batch**

```bash
grep -n "rounded-lg bg-green-700\|rounded-lg border border-neutral-300" \
  "src/app/(app)/atividades/[id]/page.tsx" \
  "src/app/(app)/atividades/page.tsx" \
  "src/app/(app)/chuva/page.tsx" \
  "src/app/(app)/contagem-frutos/page.tsx" \
  "src/app/(app)/contagem-frutos/quadra/[talhaoId]/page.tsx" \
  "src/app/(app)/diesel/page.tsx" \
  "src/app/(app)/estoque/page.tsx" \
  "src/app/(app)/estoque/produtos/[id]/editar/page.tsx" \
  "src/app/(app)/historico-pomar/page.tsx"
```

- [ ] **Step 2: For each match, check the tag it's on.** If it's a `<button>`, apply the rule above. If it's a `<Link>` (or `<a>`), leave it untouched. Add the `Button` import to each file where you convert at least one `<button>`.

- [ ] **Step 3: Verify — only `<Link>`/`<a>` occurrences should remain**

```bash
grep -n "rounded-lg bg-green-700\|rounded-lg border border-neutral-300" \
  "src/app/(app)/atividades/[id]/page.tsx" \
  "src/app/(app)/atividades/page.tsx" \
  "src/app/(app)/chuva/page.tsx" \
  "src/app/(app)/contagem-frutos/page.tsx" \
  "src/app/(app)/contagem-frutos/quadra/[talhaoId]/page.tsx" \
  "src/app/(app)/diesel/page.tsx" \
  "src/app/(app)/estoque/page.tsx" \
  "src/app/(app)/estoque/produtos/[id]/editar/page.tsx" \
  "src/app/(app)/historico-pomar/page.tsx"
```

For each remaining line, open the file and confirm it's a `Link`/`a`, not a `button`.

- [ ] **Step 4: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 5: Visual check**

Open `/atividades`, `/chuva`, `/diesel`, `/estoque`, and `/historico-pomar` at 375px. Click into a form (e.g. nova atividade) and confirm the submit/cancel buttons still work and look right.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/atividades" "src/app/(app)/chuva" "src/app/(app)/contagem-frutos" "src/app/(app)/diesel" "src/app/(app)/estoque" "src/app/(app)/historico-pomar"
git commit -m "refactor: usa Button em atividades, chuva, contagem-frutos, diesel, estoque e historico-pomar"
```

---

### Task 10: Migrate `Button` — batch 2

**Files:**
- Modify: `src/app/(app)/maquinas/[id]/page.tsx`
- Modify: `src/app/(app)/maquinas/[id]/revisoes/page.tsx`
- Modify: `src/app/(app)/maquinas/page.tsx`
- Modify: `src/app/(app)/monitoramento-pragas/armadilhas/page.tsx`
- Modify: `src/app/(app)/monitoramento-pragas/nova/page.tsx`
- Modify: `src/app/(app)/monitoramento-pragas/page.tsx`
- Modify: `src/app/(app)/monitoramento-pragas/pontos/page.tsx`
- Modify: `src/app/(app)/operadores/[id]/page.tsx`
- Modify: `src/app/(app)/operadores/page.tsx`

**Interfaces:**
- Consumes: `Button` from `src/components/ui/button.tsx` (Task 3).

Same rule and `<Link>`-skip caveat as Task 9.

- [ ] **Step 1: Find every occurrence in this batch**

```bash
grep -n "rounded-lg bg-green-700\|rounded-lg border border-neutral-300" \
  "src/app/(app)/maquinas/[id]/page.tsx" \
  "src/app/(app)/maquinas/[id]/revisoes/page.tsx" \
  "src/app/(app)/maquinas/page.tsx" \
  "src/app/(app)/monitoramento-pragas/armadilhas/page.tsx" \
  "src/app/(app)/monitoramento-pragas/nova/page.tsx" \
  "src/app/(app)/monitoramento-pragas/page.tsx" \
  "src/app/(app)/monitoramento-pragas/pontos/page.tsx" \
  "src/app/(app)/operadores/[id]/page.tsx" \
  "src/app/(app)/operadores/page.tsx"
```

- [ ] **Step 2: For each match, apply the rule from Task 9** (convert `<button>`s, skip `<Link>`/`<a>`s). Add the `Button` import where needed.

- [ ] **Step 3: Verify — only `<Link>`/`<a>` occurrences should remain**, same check pattern as Task 9 Step 3, against this batch's file list.

- [ ] **Step 4: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 5: Visual check**

Open `/maquinas`, `/monitoramento-pragas`, and `/operadores` at 375px, including a máquina detail page and a ponto de monitoramento detail page.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/maquinas" "src/app/(app)/monitoramento-pragas" "src/app/(app)/operadores"
git commit -m "refactor: usa Button em maquinas, monitoramento de pragas e operadores"
```

---

### Task 11: Migrate `Button` — batch 3

**Files:**
- Modify: `src/app/(app)/relatorios/horas-homem/page.tsx`
- Modify: `src/app/(app)/relatorios/horas-maquina/page.tsx`
- Modify: `src/app/(app)/talhoes/[id]/page.tsx`
- Modify: `src/app/(app)/talhoes/page.tsx`
- Modify: `src/app/(app)/tratamentos/[id]/page.tsx`
- Modify: `src/app/(app)/tratamentos/page.tsx`
- Modify: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `Button` from `src/components/ui/button.tsx` (Task 3).

Same rule and `<Link>`-skip caveat as Task 9. `src/app/(auth)/login/page.tsx` is the `size="lg"` worked example already shown in full in Task 9 — apply it here.

- [ ] **Step 1: Find every occurrence in this batch**

```bash
grep -n "rounded-lg bg-green-700\|rounded-lg border border-neutral-300" \
  "src/app/(app)/relatorios/horas-homem/page.tsx" \
  "src/app/(app)/relatorios/horas-maquina/page.tsx" \
  "src/app/(app)/talhoes/[id]/page.tsx" \
  "src/app/(app)/talhoes/page.tsx" \
  "src/app/(app)/tratamentos/[id]/page.tsx" \
  "src/app/(app)/tratamentos/page.tsx" \
  "src/app/(auth)/login/page.tsx"
```

- [ ] **Step 2: For each match, apply the rule from Task 9.** For the login page, use the `size="lg"` transformation shown in Task 9's worked example exactly.

- [ ] **Step 3: Verify — only `<Link>`/`<a>` occurrences should remain** in the app-pages files; the login file should have zero remaining matches (both its buttons are real `<button>`s).

```bash
grep -n "rounded-lg bg-green-700\|rounded-lg border border-neutral-300" "src/app/(auth)/login/page.tsx"
```

Expected: no output.

- [ ] **Step 4: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 5: Visual check**

Open `/login` and confirm the "Entrar" button still spans full width and submits correctly. Open `/relatorios/horas-homem`, `/talhoes`, and `/tratamentos` at 375px.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/relatorios" "src/app/(app)/talhoes" "src/app/(app)/tratamentos" "src/app/(auth)/login/page.tsx"
git commit -m "refactor: usa Button em relatorios, talhoes, tratamentos e login"
```

---

### Task 12: Migrate `Button` — batch 4 (form components, part 1)

**Files:**
- Modify: `src/components/atividades/atividade-form.tsx`
- Modify: `src/components/chuva/chuva-form.tsx`
- Modify: `src/components/contagem-frutos/contagem-form.tsx`
- Modify: `src/components/diesel/movimentacao-form.tsx`
- Modify: `src/components/diesel/tanque-form.tsx`
- Modify: `src/components/estoque/movimentacao-form.tsx`
- Modify: `src/components/estoque/produto-form.tsx`
- Modify: `src/components/historico/galeria-fotos-visita.tsx`

**Interfaces:**
- Consumes: `Button` from `src/components/ui/button.tsx` (Task 3).

Same rule as Task 9. Form components are where the `size="lg"` full-width submit pattern and `variant="secondary"` cancel pattern most commonly appear together — both these buttons are almost always real `<button>` elements (not links), since they trigger form actions.

- [ ] **Step 1: Find every occurrence in this batch**

```bash
grep -n "rounded-lg bg-green-700\|rounded-lg border border-neutral-300" \
  src/components/atividades/atividade-form.tsx \
  src/components/chuva/chuva-form.tsx \
  src/components/contagem-frutos/contagem-form.tsx \
  src/components/diesel/movimentacao-form.tsx \
  src/components/diesel/tanque-form.tsx \
  src/components/estoque/movimentacao-form.tsx \
  src/components/estoque/produto-form.tsx \
  src/components/historico/galeria-fotos-visita.tsx
```

- [ ] **Step 2: Apply the rule from Task 9 to every match.** Add the `Button` import to each file you touch.

- [ ] **Step 3: Verify — only `<Link>`/`<a>` occurrences (if any) should remain**

```bash
grep -n "rounded-lg bg-green-700\|rounded-lg border border-neutral-300" \
  src/components/atividades/atividade-form.tsx \
  src/components/chuva/chuva-form.tsx \
  src/components/contagem-frutos/contagem-form.tsx \
  src/components/diesel/movimentacao-form.tsx \
  src/components/diesel/tanque-form.tsx \
  src/components/estoque/movimentacao-form.tsx \
  src/components/estoque/produto-form.tsx \
  src/components/historico/galeria-fotos-visita.tsx
```

- [ ] **Step 4: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 5: Visual check**

Open the "nova atividade", "novo registro de chuva", and "nova movimentação de diesel" forms at 375px. Submit and cancel buttons must still work.

- [ ] **Step 6: Commit**

```bash
git add src/components/atividades src/components/chuva src/components/contagem-frutos src/components/diesel src/components/estoque src/components/historico/galeria-fotos-visita.tsx
git commit -m "refactor: usa Button nos formularios de atividades, chuva, contagem, diesel e estoque"
```

---

### Task 13: Migrate `Button` — batch 5 (form components, part 2)

**Files:**
- Modify: `src/components/historico/periodo-picker.tsx`
- Modify: `src/components/historico/visita-form.tsx`
- Modify: `src/components/maquinas/manutencao-form.tsx`
- Modify: `src/components/maquinas/maquina-form.tsx`
- Modify: `src/components/maquinas/revisao-form.tsx`
- Modify: `src/components/operacoes/adicionar-rapido.tsx`
- Modify: `src/components/operacoes/operacao-form.tsx`
- Modify: `src/components/operadores/operador-form.tsx`

**Interfaces:**
- Consumes: `Button` from `src/components/ui/button.tsx` (Task 3).

Same rule as Task 9.

- [ ] **Step 1: Find every occurrence in this batch**

```bash
grep -n "rounded-lg bg-green-700\|rounded-lg border border-neutral-300" \
  src/components/historico/periodo-picker.tsx \
  src/components/historico/visita-form.tsx \
  src/components/maquinas/manutencao-form.tsx \
  src/components/maquinas/maquina-form.tsx \
  src/components/maquinas/revisao-form.tsx \
  src/components/operacoes/adicionar-rapido.tsx \
  src/components/operacoes/operacao-form.tsx \
  src/components/operadores/operador-form.tsx
```

- [ ] **Step 2: Apply the rule from Task 9 to every match.** Add the `Button` import to each file you touch.

- [ ] **Step 3: Verify**

```bash
grep -n "rounded-lg bg-green-700\|rounded-lg border border-neutral-300" \
  src/components/historico/periodo-picker.tsx \
  src/components/historico/visita-form.tsx \
  src/components/maquinas/manutencao-form.tsx \
  src/components/maquinas/maquina-form.tsx \
  src/components/maquinas/revisao-form.tsx \
  src/components/operacoes/adicionar-rapido.tsx \
  src/components/operacoes/operacao-form.tsx \
  src/components/operadores/operador-form.tsx
```

- [ ] **Step 4: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 5: Visual check**

Open a talhão's history tab (period picker + visita form) and the "nova máquina" / "nova manutenção" / "novo operador" forms at 375px. Also check the "adicionar rápido" quick-add widget on a talhão's operações tab.

- [ ] **Step 6: Commit**

```bash
git add src/components/historico/periodo-picker.tsx src/components/historico/visita-form.tsx src/components/maquinas/manutencao-form.tsx src/components/maquinas/maquina-form.tsx src/components/maquinas/revisao-form.tsx src/components/operacoes src/components/operadores/operador-form.tsx
git commit -m "refactor: usa Button nos formularios de historico, maquinas, operacoes e operadores"
```

---

### Task 14: Migrate `Button` — batch 6 (form components, part 3 — last batch)

**Files:**
- Modify: `src/components/pragas/armadilha-form.tsx`
- Modify: `src/components/pragas/grade-leituras-form.tsx`
- Modify: `src/components/pragas/leitura-form.tsx`
- Modify: `src/components/pragas/planilha-upload-form.tsx`
- Modify: `src/components/pragas/ponto-form.tsx`
- Modify: `src/components/relatorios/exportar-botoes.tsx`
- Modify: `src/components/talhoes/talhao-form.tsx`
- Modify: `src/components/ui/confirmar-exclusao.tsx`
- Modify: `src/components/usuarios/novo-usuario-form.tsx`

**Interfaces:**
- Consumes: `Button` from `src/components/ui/button.tsx` (Task 3).

Same rule as Task 9, with one extra case: in `src/components/ui/confirmar-exclusao.tsx`, only the **"Cancelar"** button matches the secondary pattern — the "Excluir" and "Sim, excluir" buttons are red/danger (`border-red-200 text-red-600` and `bg-red-600 ... active:bg-red-700`) and must be left untouched per the Global Constraints.

Before (the one button in scope in that file):
```tsx
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
      >
        Cancelar
      </button>
```

After:
```tsx
      <Button type="button" variant="secondary" onClick={() => setConfirmando(false)}>
        Cancelar
      </Button>
```

- [ ] **Step 1: Find every occurrence in this batch**

```bash
grep -n "rounded-lg bg-green-700\|rounded-lg border border-neutral-300" \
  src/components/pragas/armadilha-form.tsx \
  src/components/pragas/grade-leituras-form.tsx \
  src/components/pragas/leitura-form.tsx \
  src/components/pragas/planilha-upload-form.tsx \
  src/components/pragas/ponto-form.tsx \
  src/components/relatorios/exportar-botoes.tsx \
  src/components/talhoes/talhao-form.tsx \
  src/components/ui/confirmar-exclusao.tsx \
  src/components/usuarios/novo-usuario-form.tsx
```

- [ ] **Step 2: Apply the rule from Task 9 to every match**, applying the "Cancelar"-only exception in `confirmar-exclusao.tsx` shown above. Add the `Button` import to each file you touch.

- [ ] **Step 3: Verify**

```bash
grep -n "rounded-lg bg-green-700\|rounded-lg border border-neutral-300" \
  src/components/pragas/armadilha-form.tsx \
  src/components/pragas/grade-leituras-form.tsx \
  src/components/pragas/leitura-form.tsx \
  src/components/pragas/planilha-upload-form.tsx \
  src/components/pragas/ponto-form.tsx \
  src/components/relatorios/exportar-botoes.tsx \
  src/components/talhoes/talhao-form.tsx \
  src/components/ui/confirmar-exclusao.tsx \
  src/components/usuarios/novo-usuario-form.tsx
```

- [ ] **Step 4: Confirm this was the last Button batch**

```bash
grep -rln "rounded-lg bg-green-700\|rounded-lg border border-neutral-300" src/app src/components | xargs -I{} grep -n "<button" {} 2>/dev/null
```

Review any output by hand — every remaining `rounded-lg bg-green-700`/`rounded-lg border border-neutral-300` match left in the codebase at this point should be on a `<Link>`/`<a>` (intentionally out of scope) or the red buttons in `confirmar-exclusao.tsx` (intentionally out of scope), never on a plain `<button>`.

- [ ] **Step 5: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 6: Visual check**

Open a ponto de monitoramento's armadilha/leitura forms, the planilha upload form, a talhão form, and trigger a delete confirmation somewhere (e.g. deleting a talhão) to confirm `confirmar-exclusao.tsx` still shows Cancelar/Excluir correctly and the two-click confirm flow still works.

- [ ] **Step 7: Commit**

```bash
git add src/components/pragas src/components/relatorios/exportar-botoes.tsx src/components/talhoes/talhao-form.tsx src/components/ui/confirmar-exclusao.tsx src/components/usuarios/novo-usuario-form.tsx
git commit -m "refactor: usa Button nos formularios de pragas, relatorios, talhoes, exclusao e usuarios"
```

---

### Task 15: Full-project verification

**Files:** None (verification only).

**Interfaces:** None — final task, depends on all previous tasks being complete.

- [ ] **Step 1: Confirm zero remaining occurrences of all three patterns outside the documented exceptions**

```bash
echo "--- card pattern ---"
grep -rln "rounded-xl border border-neutral-200 bg-white" src
echo "--- button patterns on <button> elements ---"
grep -rl "rounded-lg bg-green-700\|rounded-lg border border-neutral-300" src
```

Expected for the card check: only `src/app/(app)/page.tsx` (the Case-A property-selector button, Task 6). Expected for the button check: only files where every remaining match is on a `<Link>`/`<a>` or the red buttons in `confirmar-exclusao.tsx`.

- [ ] **Step 2: Full build**

```bash
npm run build
```

Expected: build succeeds with no new errors or warnings.

- [ ] **Step 3: Full lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Full test suite**

```bash
npm run test
```

Expected: all existing tests still pass (none of this work touches `src/lib`).

- [ ] **Step 5: End-to-end visual pass**

Start `pomo-sul-dev`, and at both 375px and 1440px widths:
- `/login` — new photo, logo, "Entrar" button.
- `/` (dashboard) — new photo, stat cards, property selector.
- Side nav (desktop only) — logo instead of "POMO SUL" text.
- One list page with cards (e.g. `/talhoes`) and one form (e.g. nova atividade) — confirm buttons and cards all read consistently with the shadow/focus-ring polish.

- [ ] **Step 6: Commit (only if Step 5 surfaced fixes)**

If the visual pass found nothing to fix, skip this step — there's nothing to commit. Otherwise:

```bash
git add -A
git commit -m "fix: ajustes finais da verificacao visual da identidade visual"
```
