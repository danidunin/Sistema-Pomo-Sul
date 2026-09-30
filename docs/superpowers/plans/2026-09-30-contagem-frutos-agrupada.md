# Contagem de Frutos agrupada por quadra — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat, all-quadras-mixed list on `/contagem-frutos` with a screen that
shows one card per quadra+safra (weighted kg/ha, progress vs. meta, % of plants sampled),
and a new per-quadra detail page listing that quadra's individual counts.

**Architecture:** Pure aggregation logic lives in `src/lib/contagem-frutos.ts` (already home
to `calcularEstimativaSafra`), unit-tested with Vitest. Two Server Components consume it:
the rewritten list page (`/contagem-frutos`) and a new detail page
(`/contagem-frutos/quadra/[talhaoId]`). A shared presentational component renders the card
body in both places. No schema changes — `Talhao.numeroPlantas` and `ContagemFrutos` already
have everything needed.

**Tech Stack:** Next.js App Router (Server Components), Prisma 7, Vitest, Tailwind.

## Global Constraints

- No `window.confirm()` — not used by this feature (no new delete flows), but if touched, follow the existing two-step inline confirm pattern.
- No destructive/renaming Prisma migrations — this plan adds no migration at all.
- Safra values contain `/` (e.g. `"2026/2027"`) — must go in query strings (`?safra=`), never in a route path segment.
- `Talhao.numeroPlantas` is optional (nullable) — every consumer must handle `null` by omitting the % amostrado UI, not by defaulting to 0 or throwing.
- Follow existing formatting conventions: `Intl.NumberFormat("pt-BR", ...)` instances at module scope, not re-created per render; `formatarData` from `@/lib/format` for dates.

---

## File Structure

- **Modify `src/lib/contagem-frutos.ts`** — add `mediaPonderada` (moved here from
  `page.tsx`, currently private to that file), `ContagemParaAgrupar` and `GrupoQuadraSafra`
  types, `agruparContagensPorQuadra`, `ordenarGruposPorNomeQuadra`, `ordenarSafrasDesc`. Pure
  functions only, no I/O — consistent with the existing `calcularEstimativaSafra`.
- **Create `src/lib/contagem-frutos.test.ts`** — Vitest unit tests for everything added above.
- **Create `src/components/contagem-frutos/quadra-resumo.tsx`** — presentational component
  `QuadraResumoConteudo({ grupo })` rendering the card body (name, safra badge, kg/ha, meta
  progress bar, % amostrado bar when available, count + last date). Used by both the list
  page (wrapped in a `<Link>`) and the detail page (wrapped in a plain bordered `<div>`).
- **Modify `src/app/(app)/contagem-frutos/page.tsx`** — rewritten: safra filter instead of
  talhão filter + month/year, fetch + group + render cards.
- **Create `src/app/(app)/contagem-frutos/quadra/[talhaoId]/page.tsx`** — detail page: resumo
  card + month/year filter + list of individual contagens + "nova contagem" link.
- **Modify `src/app/(app)/contagem-frutos/nova/page.tsx`** — accept `?safra=` in
  `searchParams` and pass through to `ContagemForm`'s `defaultValues.safra`.
- **No changes:** `src/app/(app)/contagem-frutos/[id]/page.tsx`,
  `src/components/contagem-frutos/contagem-form.tsx`,
  `src/components/contagem-frutos/excluir-contagem-form.tsx`, `src/actions/contagem-frutos.ts`.

---

## Task 1: `mediaPonderada` in lib, with tests

**Files:**
- Modify: `src/lib/contagem-frutos.ts`
- Test: `src/lib/contagem-frutos.test.ts`

**Interfaces:**
- Produces: `mediaPonderada(pares: { valor: number; peso: number }[]): number`

- [ ] **Step 1: Write the failing test**

Create `src/lib/contagem-frutos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mediaPonderada } from "@/lib/contagem-frutos";

describe("mediaPonderada", () => {
  it("pondera pelo peso de cada par", () => {
    const resultado = mediaPonderada([
      { valor: 100, peso: 2 },
      { valor: 200, peso: 1 },
    ]);
    expect(resultado).toBeCloseTo((100 * 2 + 200 * 1) / 3);
  });

  it("peso total zero retorna 0 em vez de dividir por zero", () => {
    expect(mediaPonderada([{ valor: 100, peso: 0 }])).toBe(0);
  });

  it("lista vazia retorna 0", () => {
    expect(mediaPonderada([])).toBe(0);
  });

  it("um único par retorna o próprio valor", () => {
    expect(mediaPonderada([{ valor: 42, peso: 5 }])).toBe(42);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- contagem-frutos`
Expected: FAIL — `mediaPonderada` is not exported from `@/lib/contagem-frutos`.

- [ ] **Step 3: Add `mediaPonderada` to the lib**

In `src/lib/contagem-frutos.ts`, add (this is a straight move of the function already defined
locally in `src/app/(app)/contagem-frutos/page.tsx:14-18` — same body, now exported):

```ts
export type ParPeso = { valor: number; peso: number };

/**
 * Média ponderada pelo peso de cada par — usada para agregar métricas de várias
 * contagens (ex: plantas amostradas) sem dar o mesmo peso a amostras pequenas e grandes.
 */
export function mediaPonderada(pares: ParPeso[]): number {
  const pesoTotal = pares.reduce((soma, p) => soma + p.peso, 0);
  if (pesoTotal === 0) return 0;
  return pares.reduce((soma, p) => soma + p.valor * p.peso, 0) / pesoTotal;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- contagem-frutos`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/contagem-frutos.ts src/lib/contagem-frutos.test.ts
git commit -m "Move mediaPonderada para o lib de contagem de frutos, com testes"
```

---

## Task 2: `agruparContagensPorQuadra`

**Files:**
- Modify: `src/lib/contagem-frutos.ts`
- Test: `src/lib/contagem-frutos.test.ts`

**Interfaces:**
- Consumes: `mediaPonderada` (Task 1)
- Produces:
  ```ts
  export type ContagemParaAgrupar = {
    talhaoId: string;
    talhaoNome: string;
    numeroPlantasTalhao: number | null;
    safra: string;
    metaFrutosPorPlanta: number;
    numeroPlantasAmostradas: number;
    frutosContados: number;
    plantasPorHectare: number;
    pesoMedioFrutoG: number;
    data: Date;
  };

  export type GrupoQuadraSafra = {
    talhaoId: string;
    talhaoNome: string;
    safra: string;
    metaFrutosPorPlanta: number;
    numeroContagens: number;
    dataUltimaContagem: Date;
    mediaFrutosPorPlanta: number;
    produtividadeEstimadaKgHa: number;
    totalPlantasAmostradas: number;
    numeroPlantasTalhao: number | null;
    percentualAmostrado: number | null;
  };

  export function agruparContagensPorQuadra(contagens: ContagemParaAgrupar[]): GrupoQuadraSafra[]
  ```
  Later tasks (page components) rely on exactly these field names.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/contagem-frutos.test.ts`:

```ts
import { agruparContagensPorQuadra, type ContagemParaAgrupar } from "@/lib/contagem-frutos";

function contagem(overrides: Partial<ContagemParaAgrupar>): ContagemParaAgrupar {
  return {
    talhaoId: "talhao1",
    talhaoNome: "Quadra 1",
    numeroPlantasTalhao: 1000,
    safra: "2026/2027",
    metaFrutosPorPlanta: 180,
    numeroPlantasAmostradas: 50,
    frutosContados: 9000,
    plantasPorHectare: 500,
    pesoMedioFrutoG: 200,
    data: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("agruparContagensPorQuadra", () => {
  it("agrupa por talhão + safra, não só por talhão", () => {
    const resultado = agruparContagensPorQuadra([
      contagem({ safra: "2025/2026" }),
      contagem({ safra: "2026/2027" }),
    ]);
    expect(resultado).toHaveLength(2);
    expect(resultado.map((g) => g.safra).sort()).toEqual(["2025/2026", "2026/2027"]);
  });

  it("não mistura quadras diferentes na mesma safra", () => {
    const resultado = agruparContagensPorQuadra([
      contagem({ talhaoId: "talhao1" }),
      contagem({ talhaoId: "talhao2", talhaoNome: "Quadra 2" }),
    ]);
    expect(resultado).toHaveLength(2);
  });

  it("calcula kg/ha ponderado pelas plantas amostradas de cada contagem, igual à média consolidada de hoje", () => {
    const resultado = agruparContagensPorQuadra([
      contagem({ numeroPlantasAmostradas: 40, frutosContados: 6000, plantasPorHectare: 500, pesoMedioFrutoG: 200 }),
      contagem({ numeroPlantasAmostradas: 10, frutosContados: 2000, plantasPorHectare: 500, pesoMedioFrutoG: 200 }),
    ]);
    // média frutos/planta ponderada: (150*40 + 200*10) / 50 = 160
    // kg/ha = 160 * 500 * 200 / 1000 = 16000
    expect(resultado[0].mediaFrutosPorPlanta).toBeCloseTo(160);
    expect(resultado[0].produtividadeEstimadaKgHa).toBeCloseTo(16000);
  });

  it("soma numeroPlantasAmostradas de todas as contagens do grupo (cumulativo)", () => {
    const resultado = agruparContagensPorQuadra([
      contagem({ numeroPlantasAmostradas: 40 }),
      contagem({ numeroPlantasAmostradas: 60 }),
    ]);
    expect(resultado[0].totalPlantasAmostradas).toBe(100);
  });

  it("calcula percentualAmostrado a partir do total cumulativo sobre numeroPlantasTalhao", () => {
    const resultado = agruparContagensPorQuadra([
      contagem({ numeroPlantasTalhao: 1000, numeroPlantasAmostradas: 40 }),
      contagem({ numeroPlantasTalhao: 1000, numeroPlantasAmostradas: 60 }),
    ]);
    expect(resultado[0].percentualAmostrado).toBeCloseTo(10);
  });

  it("percentualAmostrado é null quando o talhão não tem numeroPlantas cadastrado", () => {
    const resultado = agruparContagensPorQuadra([contagem({ numeroPlantasTalhao: null })]);
    expect(resultado[0].percentualAmostrado).toBeNull();
  });

  it("conta numeroContagens e acha a data mais recente do grupo", () => {
    const resultado = agruparContagensPorQuadra([
      contagem({ data: new Date("2026-09-01T00:00:00.000Z") }),
      contagem({ data: new Date("2026-09-19T00:00:00.000Z") }),
      contagem({ data: new Date("2026-09-10T00:00:00.000Z") }),
    ]);
    expect(resultado[0].numeroContagens).toBe(3);
    expect(resultado[0].dataUltimaContagem).toEqual(new Date("2026-09-19T00:00:00.000Z"));
  });

  it("lista vazia retorna lista vazia", () => {
    expect(agruparContagensPorQuadra([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- contagem-frutos`
Expected: FAIL — `agruparContagensPorQuadra` is not exported.

- [ ] **Step 3: Implement `agruparContagensPorQuadra`**

Add to `src/lib/contagem-frutos.ts`:

```ts
export type ContagemParaAgrupar = {
  talhaoId: string;
  talhaoNome: string;
  numeroPlantasTalhao: number | null;
  safra: string;
  metaFrutosPorPlanta: number;
  numeroPlantasAmostradas: number;
  frutosContados: number;
  plantasPorHectare: number;
  pesoMedioFrutoG: number;
  data: Date;
};

export type GrupoQuadraSafra = {
  talhaoId: string;
  talhaoNome: string;
  safra: string;
  metaFrutosPorPlanta: number;
  numeroContagens: number;
  dataUltimaContagem: Date;
  mediaFrutosPorPlanta: number;
  produtividadeEstimadaKgHa: number;
  totalPlantasAmostradas: number;
  numeroPlantasTalhao: number | null;
  percentualAmostrado: number | null;
};

/**
 * Agrupa contagens por talhão + safra e agrega os totais do grupo com a mesma fórmula
 * ponderada usada hoje na "Média consolidada" (page.tsx), só que por grupo em vez de sobre
 * a lista toda.
 */
export function agruparContagensPorQuadra(contagens: ContagemParaAgrupar[]): GrupoQuadraSafra[] {
  const grupos = new Map<string, ContagemParaAgrupar[]>();
  for (const c of contagens) {
    const chave = `${c.talhaoId}::${c.safra}`;
    const lista = grupos.get(chave);
    if (lista) lista.push(c);
    else grupos.set(chave, [c]);
  }

  return Array.from(grupos.values()).map((lista) => {
    const primeira = lista[0];
    const pesos = lista.map((c) => c.numeroPlantasAmostradas);

    const mediaFrutosPorPlanta = mediaPonderada(
      lista.map((c, i) => ({
        valor: c.numeroPlantasAmostradas > 0 ? c.frutosContados / c.numeroPlantasAmostradas : 0,
        peso: pesos[i],
      })),
    );
    const plantasPorHectareMedia = mediaPonderada(
      lista.map((c, i) => ({ valor: c.plantasPorHectare, peso: pesos[i] })),
    );
    const pesoMedioFrutoGMedia = mediaPonderada(
      lista.map((c, i) => ({ valor: c.pesoMedioFrutoG, peso: pesos[i] })),
    );
    const produtividadeEstimadaKgHa = (mediaFrutosPorPlanta * plantasPorHectareMedia * pesoMedioFrutoGMedia) / 1000;

    const totalPlantasAmostradas = lista.reduce((soma, c) => soma + c.numeroPlantasAmostradas, 0);
    const numeroPlantasTalhao = primeira.numeroPlantasTalhao;
    const percentualAmostrado =
      numeroPlantasTalhao != null && numeroPlantasTalhao > 0
        ? (totalPlantasAmostradas / numeroPlantasTalhao) * 100
        : null;

    const dataUltimaContagem = lista.reduce((max, c) => (c.data > max ? c.data : max), primeira.data);

    return {
      talhaoId: primeira.talhaoId,
      talhaoNome: primeira.talhaoNome,
      safra: primeira.safra,
      metaFrutosPorPlanta: primeira.metaFrutosPorPlanta,
      numeroContagens: lista.length,
      dataUltimaContagem,
      mediaFrutosPorPlanta,
      produtividadeEstimadaKgHa,
      totalPlantasAmostradas,
      numeroPlantasTalhao,
      percentualAmostrado,
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- contagem-frutos`
Expected: PASS (all tests, this file's total is now 12)

- [ ] **Step 5: Commit**

```bash
git add src/lib/contagem-frutos.ts src/lib/contagem-frutos.test.ts
git commit -m "Adiciona agruparContagensPorQuadra para agregar contagens por quadra"
```

---

## Task 3: `ordenarGruposPorNomeQuadra` and `ordenarSafrasDesc`

**Files:**
- Modify: `src/lib/contagem-frutos.ts`
- Test: `src/lib/contagem-frutos.test.ts`

**Interfaces:**
- Consumes: `GrupoQuadraSafra` (Task 2)
- Produces:
  - `ordenarGruposPorNomeQuadra(grupos: GrupoQuadraSafra[]): GrupoQuadraSafra[]`
  - `ordenarSafrasDesc(safras: string[]): string[]`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/contagem-frutos.test.ts`:

```ts
import { ordenarGruposPorNomeQuadra, ordenarSafrasDesc } from "@/lib/contagem-frutos";

describe("ordenarGruposPorNomeQuadra", () => {
  it("ordena alfabeticamente pelo nome da quadra, acentos incluídos", () => {
    const grupos = [
      contagem({ talhaoNome: "Éter" }),
      contagem({ talhaoNome: "Abacate" }),
    ].map((c) => agruparContagensPorQuadra([c])[0]);

    const ordenado = ordenarGruposPorNomeQuadra(grupos);
    expect(ordenado.map((g) => g.talhaoNome)).toEqual(["Abacate", "Éter"]);
  });

  it("não modifica o array original", () => {
    const grupos = agruparContagensPorQuadra([contagem({ talhaoNome: "B" }), contagem({ talhaoId: "t2", talhaoNome: "A" })]);
    const original = [...grupos];
    ordenarGruposPorNomeQuadra(grupos);
    expect(grupos).toEqual(original);
  });
});

describe("ordenarSafrasDesc", () => {
  it("ordena da safra mais recente para a mais antiga, sem duplicar", () => {
    expect(ordenarSafrasDesc(["2024/2025", "2026/2027", "2024/2025", "2025/2026"])).toEqual([
      "2026/2027",
      "2025/2026",
      "2024/2025",
    ]);
  });

  it("lista vazia retorna lista vazia", () => {
    expect(ordenarSafrasDesc([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- contagem-frutos`
Expected: FAIL — `ordenarGruposPorNomeQuadra`/`ordenarSafrasDesc` not exported.

- [ ] **Step 3: Implement both functions**

Add to `src/lib/contagem-frutos.ts`:

```ts
export function ordenarGruposPorNomeQuadra(grupos: GrupoQuadraSafra[]): GrupoQuadraSafra[] {
  return [...grupos].sort((a, b) => a.talhaoNome.localeCompare(b.talhaoNome, "pt-BR"));
}

export function ordenarSafrasDesc(safras: string[]): string[] {
  return Array.from(new Set(safras)).sort((a, b) => b.localeCompare(a));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- contagem-frutos`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/contagem-frutos.ts src/lib/contagem-frutos.test.ts
git commit -m "Adiciona ordenação dos cards de quadra e do dropdown de safra"
```

---

## Task 4: Shared card component `QuadraResumoConteudo`

**Files:**
- Create: `src/components/contagem-frutos/quadra-resumo.tsx`

**Interfaces:**
- Consumes: `GrupoQuadraSafra` (Task 2), `formatarData` from `@/lib/format`
- Produces: `QuadraResumoConteudo({ grupo }: { grupo: GrupoQuadraSafra })` — a server-renderable
  (no `"use client"`) presentational component. Callers wrap it in whatever container they
  need (`<Link>` on the list page, a plain `<div>` on the detail page) — this component only
  renders the inner content, no card border/link of its own.

- [ ] **Step 1: Write the component**

Create `src/components/contagem-frutos/quadra-resumo.tsx`:

```tsx
import type { GrupoQuadraSafra } from "@/lib/contagem-frutos";
import { formatarData } from "@/lib/format";

const formatoKg = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const formatoNumero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const formatoInteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function QuadraResumoConteudo({ grupo }: { grupo: GrupoQuadraSafra }) {
  const progressoMeta =
    grupo.metaFrutosPorPlanta > 0 ? Math.min(100, (grupo.mediaFrutosPorPlanta / grupo.metaFrutosPorPlanta) * 100) : 0;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-neutral-900">
          {grupo.talhaoNome} <span className="font-normal text-neutral-400">· safra {grupo.safra}</span>
        </p>
        <span className="whitespace-nowrap text-sm font-semibold text-neutral-900">
          {formatoKg.format(grupo.produtividadeEstimadaKgHa)} kg/ha
        </span>
      </div>
      <p className="mt-0.5 text-xs text-neutral-500">
        {grupo.numeroContagens} {grupo.numeroContagens === 1 ? "contagem" : "contagens"} · última{" "}
        {formatarData(grupo.dataUltimaContagem)}
      </p>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className={progressoMeta >= 100 ? "h-full bg-green-600" : "h-full bg-amber-500"}
          style={{ width: `${progressoMeta}%` }}
        />
      </div>
      <p className="mt-0.5 text-xs text-neutral-500">
        média {formatoNumero.format(grupo.mediaFrutosPorPlanta)} de meta {formatoNumero.format(grupo.metaFrutosPorPlanta)}
      </p>

      {grupo.percentualAmostrado != null && (
        <>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full bg-blue-600"
                style={{ width: `${Math.min(100, grupo.percentualAmostrado)}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-[11px] font-medium text-blue-700">
              {formatoInteiro.format(grupo.percentualAmostrado)}% amostrado
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-neutral-400">
            {formatoInteiro.format(grupo.totalPlantasAmostradas)} de{" "}
            {formatoInteiro.format(grupo.numeroPlantasTalhao ?? 0)} plantas
          </p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/contagem-frutos/quadra-resumo.tsx
git commit -m "Adiciona componente compartilhado de resumo da quadra"
```

---

## Task 5: Rewrite the list page (`/contagem-frutos`)

**Files:**
- Modify: `src/app/(app)/contagem-frutos/page.tsx`

**Interfaces:**
- Consumes: `agruparContagensPorQuadra`, `ordenarGruposPorNomeQuadra`, `ordenarSafrasDesc`,
  `ContagemParaAgrupar` (Task 2/3 in `@/lib/contagem-frutos`), `QuadraResumoConteudo` (Task 4).

- [ ] **Step 1: Replace the page body**

Replace the full contents of `src/app/(app)/contagem-frutos/page.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import {
  agruparContagensPorQuadra,
  ordenarGruposPorNomeQuadra,
  ordenarSafrasDesc,
  type ContagemParaAgrupar,
} from "@/lib/contagem-frutos";
import { QuadraResumoConteudo } from "@/components/contagem-frutos/quadra-resumo";

export default async function ContagemFrutosPage({
  searchParams,
}: {
  searchParams: Promise<{ safra?: string }>;
}) {
  const { safra } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const metasSafra = await db.metaSafra.findMany({
    where: { talhao: { propriedadeId } },
    select: { safra: true },
    distinct: ["safra"],
  });
  const safras = ordenarSafrasDesc(metasSafra.map((m) => m.safra));
  const safraSelecionada = safra ?? safras[0];

  const contagens = safraSelecionada
    ? await db.contagemFrutos.findMany({
        where: { propriedadeId, metaSafra: { safra: safraSelecionada } },
        include: {
          talhao: { select: { nomeCodinome: true, numeroPlantas: true } },
          metaSafra: { select: { safra: true, metaFrutosPorPlanta: true } },
        },
      })
    : [];

  const paraAgrupar: ContagemParaAgrupar[] = contagens.map((c) => ({
    talhaoId: c.talhaoId,
    talhaoNome: c.talhao.nomeCodinome,
    numeroPlantasTalhao: c.talhao.numeroPlantas,
    safra: c.metaSafra.safra,
    metaFrutosPorPlanta: Number(c.metaSafra.metaFrutosPorPlanta),
    numeroPlantasAmostradas: c.numeroPlantasAmostradas,
    frutosContados: c.frutosContados,
    plantasPorHectare: Number(c.plantasPorHectare),
    pesoMedioFrutoG: Number(c.pesoMedioFrutoG),
    data: c.data,
  }));

  const grupos = ordenarGruposPorNomeQuadra(agruparContagensPorQuadra(paraAgrupar));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Contagem de Frutos / Estimativa de Safra</h1>
        <Link
          href={`/contagem-frutos/nova${safraSelecionada ? `?safra=${encodeURIComponent(safraSelecionada)}` : ""}`}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova contagem
        </Link>
      </div>

      {safras.length > 0 && (
        <form className="flex flex-wrap gap-2">
          <select
            name="safra"
            defaultValue={safraSelecionada}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            {safras.map((s) => (
              <option key={s} value={s}>
                safra {s}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            Filtrar
          </button>
        </form>
      )}

      {grupos.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma contagem registrada ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {grupos.map((grupo) => (
            <Link
              key={`${grupo.talhaoId}::${grupo.safra}`}
              href={`/contagem-frutos/quadra/${grupo.talhaoId}?safra=${encodeURIComponent(grupo.safra)}`}
              className="block border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
            >
              <QuadraResumoConteudo grupo={grupo} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/contagem-frutos/page.tsx
git commit -m "Agrupa a tela de contagem de frutos por quadra+safra"
```

---

## Task 6: `?safra=` prefill on the "nova contagem" page

**Files:**
- Modify: `src/app/(app)/contagem-frutos/nova/page.tsx`

- [ ] **Step 1: Accept and pass through `safra`**

In `src/app/(app)/contagem-frutos/nova/page.tsx`, change the `searchParams` type and the
`defaultValues` prop:

```tsx
export default async function NovaContagemPage({
  searchParams,
}: {
  searchParams: Promise<{ talhaoId?: string; safra?: string }>;
}) {
  const { talhaoId, safra } = await searchParams;
  // ...unchanged fetch logic...
```

And where `ContagemForm` is rendered, replace:

```tsx
defaultValues={talhaoId ? { talhaoId } : undefined}
```

with:

```tsx
defaultValues={talhaoId || safra ? { talhaoId, safra } : undefined}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`ContagemForm`'s `ValoresIniciaisContagem` already has an optional
`safra: string` field, so no type changes needed there.)

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/contagem-frutos/nova/page.tsx
git commit -m "Pré-preenche safra na tela de nova contagem via query string"
```

---

## Task 7: Detail page `/contagem-frutos/quadra/[talhaoId]`

**Files:**
- Create: `src/app/(app)/contagem-frutos/quadra/[talhaoId]/page.tsx`

**Interfaces:**
- Consumes: `agruparContagensPorQuadra`, `ContagemParaAgrupar` (`@/lib/contagem-frutos`),
  `QuadraResumoConteudo` (`@/components/contagem-frutos/quadra-resumo`), `PeriodoPicker`
  (`@/components/historico/periodo-picker`), `VoltarLink` (`@/components/nav/voltar-link`),
  `formatarData` (`@/lib/format`), `calcularEstimativaSafra` (`@/lib/contagem-frutos`, for the
  per-row kg figure — same as today's list rows).

- [ ] **Step 1: Write the page**

Create `src/app/(app)/contagem-frutos/quadra/[talhaoId]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import {
  agruparContagensPorQuadra,
  calcularEstimativaSafra,
  type ContagemParaAgrupar,
} from "@/lib/contagem-frutos";
import { QuadraResumoConteudo } from "@/components/contagem-frutos/quadra-resumo";
import { formatarData } from "@/lib/format";
import { PeriodoPicker } from "@/components/historico/periodo-picker";
import { VoltarLink } from "@/components/nav/voltar-link";

const formatoKg = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const formatoNumero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export default async function QuadraContagemFrutosPage({
  params,
  searchParams,
}: {
  params: Promise<{ talhaoId: string }>;
  searchParams: Promise<{ safra?: string; mesAno?: string }>;
}) {
  const { talhaoId } = await params;
  const { safra, mesAno } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();
  if (!safra) notFound();

  const contagens = await db.contagemFrutos.findMany({
    where: { propriedadeId, talhaoId, metaSafra: { safra } },
    include: {
      talhao: { select: { nomeCodinome: true, numeroPlantas: true } },
      metaSafra: { select: { safra: true, metaFrutosPorPlanta: true } },
    },
    orderBy: { data: "desc" },
  });
  if (contagens.length === 0) notFound();

  const paraAgrupar: ContagemParaAgrupar[] = contagens.map((c) => ({
    talhaoId: c.talhaoId,
    talhaoNome: c.talhao.nomeCodinome,
    numeroPlantasTalhao: c.talhao.numeroPlantas,
    safra: c.metaSafra.safra,
    metaFrutosPorPlanta: Number(c.metaSafra.metaFrutosPorPlanta),
    numeroPlantasAmostradas: c.numeroPlantasAmostradas,
    frutosContados: c.frutosContados,
    plantasPorHectare: Number(c.plantasPorHectare),
    pesoMedioFrutoG: Number(c.pesoMedioFrutoG),
    data: c.data,
  }));
  const grupo = agruparContagensPorQuadra(paraAgrupar)[0];

  const [anoStr, mesStr] = mesAno?.split("-") ?? [];
  const ano = anoStr ? Number(anoStr) : undefined;
  const mes = mesStr ? Number(mesStr) : undefined;
  const contagensFiltradas =
    mes && ano
      ? contagens.filter((c) => c.data >= new Date(ano, mes - 1, 1) && c.data < new Date(ano, mes, 1))
      : contagens;

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={`/contagem-frutos?safra=${encodeURIComponent(safra)}`} label="Voltar" />

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <QuadraResumoConteudo grupo={grupo} />
      </div>

      <div className="flex items-center justify-between">
        <PeriodoPicker valorInicial={mesAno} />
        <Link
          href={`/contagem-frutos/nova?talhaoId=${talhaoId}&safra=${encodeURIComponent(safra)}`}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova contagem
        </Link>
      </div>

      {contagensFiltradas.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma contagem neste período.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {contagensFiltradas.map((c) => {
            const estimativa = calcularEstimativaSafra({
              metaFrutosPorPlanta: Number(c.metaSafra.metaFrutosPorPlanta),
              numeroPlantasAmostradas: c.numeroPlantasAmostradas,
              frutosContados: c.frutosContados,
              areaHa: Number(c.areaHa),
              plantasPorHectare: Number(c.plantasPorHectare),
              pesoMedioFrutoG: Number(c.pesoMedioFrutoG),
            });
            return (
              <Link
                key={c.id}
                href={`/contagem-frutos/${c.id}`}
                className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900">{formatarData(c.data)}</p>
                  <p className="text-xs text-neutral-500">
                    Média {formatoNumero.format(estimativa.mediaFrutosPorPlanta)} de meta{" "}
                    {formatoNumero.format(Number(c.metaSafra.metaFrutosPorPlanta))}
                  </p>
                </div>
                <span className="text-sm font-medium text-neutral-700">
                  {formatoKg.format(estimativa.estimativaSafraKg)} kg
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/contagem-frutos/quadra/
git commit -m "Adiciona tela de detalhe da contagem de frutos por quadra"
```

---

## Task 8: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the new `contagem-frutos.test.ts` cases.

- [ ] **Step 2: Type-check and lint the whole project**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Manual verification in the browser**

Start the dev server and, for the property that already has fruit-count data:

1. Open `/contagem-frutos` — confirm it shows one card per quadra (not one row per
   contagem), sorted alphabetically, for the most recent safra with data.
2. Switch the safra dropdown to a different safra (if more than one exists) and confirm the
   card set changes accordingly.
3. Click a card — confirm it navigates to `/contagem-frutos/quadra/[id]?safra=...` and shows
   the same summary at the top plus the individual contagens below, most recent first.
4. On the detail page, use the month/year picker and confirm the list filters while the
   summary card at the top stays the season-to-date total (unaffected by the filter).
5. Click an individual contagem row — confirm it still opens the existing edit page and
   saves correctly.
6. Click "+ Nova contagem" from the detail page — confirm the quadra and safra are
   pre-filled in the form.
7. Find (or temporarily edit) a talhão with no `numeroPlantas` set — confirm its card omits
   the "% amostrado" line entirely rather than showing `0%` or crashing.
8. Confirm "Voltar" from the detail page returns to the list page with the same safra still
   selected.

- [ ] **Step 4: Report results**

Summarize pass/fail for each of the manual checks above before considering this plan done.
