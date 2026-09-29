# Limite de Aplicações por Ciclo (Tratamentos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user mark a product with a maximum number of applications per agricultural
cycle, and see a per-quadra matrix (plus an inline warning at entry time) showing how many
times each key product has been applied in each quadra this cycle.

**Architecture:** A pure date-math module (`src/lib/ciclo.ts`) computes the fixed May→April
cycle from any date, with no DB access. A second module (`src/lib/limite-aplicacoes.ts`)
adds one DB query (grouping `OperacaoProduto` rows by talhão + cycle for products that have
a limit set) plus pure aggregation/status functions on top of it. Both the new
`/tratamentos/resumo` matrix page and the existing "novo tratamento" form consume the same
DB query function, so the counting logic lives in exactly one place. A single new nullable
column on `Produto` (`limiteAplicacoesCiclo`) is both the "this product is tracked" flag and
its limit — no separate boolean field.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), Prisma 7 +
PostgreSQL, Vitest for unit tests, Tailwind for styling.

## Global Constraints

- Ciclo agrícola é fixo: 1º de maio a 30 de abril, identificado como `"<ano>/<ano+1>"`.
  Nunca cadastrado manualmente — sempre calculado a partir da data do tratamento.
- O limite de aplicações é uma propriedade do **produto** (um único número), não da quadra:
  o mesmo limite vale em todas as quadras onde o produto é usado.
- A **contagem** é sempre por quadra: número de `OperacaoAgricola` distintas (não soma de
  quantidade/volume) que usam aquele produto naquela quadra, dentro da janela do ciclo.
  Conta em qualquer `TipoOperacao` (fitossanitário, herbicida, adubação, outra).
- Nunca bloquear o envio do formulário por causa do limite — é sempre um aviso, nunca uma
  trava.
- Migrações são manuais e aditivas: SQL escrito à mão em
  `prisma/migrations/<timestamp>_<nome>/migration.sql`, nunca destrutivo.
- Datas de campos "somente data" (`<input type="date">`) são salvas/lidas como meia-noite
  UTC em todo o app (ver `src/lib/format.ts`) — todo cálculo de ciclo usa os getters UTC de
  `Date` (`getUTCMonth`, `getUTCFullYear`, `Date.UTC(...)`), nunca os getters locais.

---

### Task 1: Coluna `limiteAplicacoesCiclo` em `Produto`

**Files:**
- Modify: `prisma/schema.prisma:175-193` (model `Produto`)
- Create: `prisma/migrations/20260929120000_limite_aplicacoes_ciclo/migration.sql`

**Interfaces:**
- Produces: `Produto.limiteAplicacoesCiclo: number | null` (Prisma Client field), consumed
  by Task 3 (`buscarContagensChaveParaFormulario`), Task 4 (produto form/actions), and
  Task 5 (resumo page).

- [ ] **Step 1: Add the field to the Prisma schema**

In `prisma/schema.prisma`, inside `model Produto` (currently lines 175-193), add the new
field right after `observacoes`:

```prisma
model Produto {
  id                   String          @id @default(cuid())
  propriedade          Propriedade     @relation(fields: [propriedadeId], references: [id])
  propriedadeId        String          @map("propriedade_id")
  nome                 String
  unidade              String
  unidadeDosagem       UnidadeDosagem? @map("unidade_dosagem")
  quantidadeDisponivel Decimal         @default(0) @map("quantidade_disponivel") @db.Decimal(12, 3)
  ativo                Boolean         @default(true)
  observacoes          String?
  limiteAplicacoesCiclo Int?           @map("limite_aplicacoes_ciclo")
  createdAt            DateTime        @default(now()) @map("created_at")

  itensOperacao  OperacaoProduto[]
  movimentacoes  EstoqueMovimentacao[]

  @@index([nome])
  @@index([propriedadeId])
  @@map("produtos")
}
```

- [ ] **Step 2: Write the migration by hand**

Create `prisma/migrations/20260929120000_limite_aplicacoes_ciclo/migration.sql`:

```sql
-- Limite opcional de aplicações por ciclo agrícola (maio-abril). Quando
-- preenchido, o produto passa a ser rastreado no resumo do ciclo em
-- Tratamentos — não existe flag "é produto-chave" separada.

ALTER TABLE "produtos" ADD COLUMN "limite_aplicacoes_ciclo" INTEGER;
```

- [ ] **Step 3: Apply the migration and regenerate the Prisma client**

Run:
```bash
npx prisma migrate dev
```
Expected: Prisma detects the new migration folder, applies it, and regenerates
`src/generated/prisma`. It should NOT propose any other schema change — if it does, stop
and check that `schema.prisma` matches Step 1 exactly.

- [ ] **Step 4: Verify with a typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: no new errors (the field isn't used anywhere yet, so this just confirms the
generated client compiled).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260929120000_limite_aplicacoes_ciclo
git commit -m "feat: add produto.limiteAplicacoesCiclo column"
```

---

### Task 2: Ciclo agrícola (maio–abril) — `src/lib/ciclo.ts`

**Files:**
- Create: `src/lib/ciclo.ts`
- Test: `src/lib/ciclo.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Ciclo = { anoInicio: number; label: string; inicio: Date; fim: Date };
  export function cicloDaData(data: Date): Ciclo;
  export function cicloAtual(): Ciclo;
  ```
  Consumed by Task 3 (`limite-aplicacoes.ts`) and Task 6 (`operacao-form.tsx`, resumo page).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/ciclo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cicloDaData } from "@/lib/ciclo";

describe("cicloDaData", () => {
  it("uma data em maio cai no ciclo que começa no mesmo ano", () => {
    const ciclo = cicloDaData(new Date("2026-05-15T00:00:00.000Z"));
    expect(ciclo.anoInicio).toBe(2026);
    expect(ciclo.label).toBe("2026/2027");
  });

  it("uma data em abril cai no ciclo que começou no ano anterior", () => {
    const ciclo = cicloDaData(new Date("2026-04-15T00:00:00.000Z"));
    expect(ciclo.anoInicio).toBe(2025);
    expect(ciclo.label).toBe("2025/2026");
  });

  it("1º de maio já é o início do novo ciclo", () => {
    expect(cicloDaData(new Date("2026-05-01T00:00:00.000Z")).label).toBe("2026/2027");
  });

  it("30 de abril ainda é o último dia do ciclo anterior", () => {
    expect(cicloDaData(new Date("2026-04-30T00:00:00.000Z")).label).toBe("2025/2026");
  });

  it("define início e fim do ciclo em UTC, cobrindo o ano inteiro", () => {
    const ciclo = cicloDaData(new Date("2026-06-01T00:00:00.000Z"));
    expect(ciclo.inicio.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(ciclo.fim.toISOString()).toBe("2027-04-30T23:59:59.999Z");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/ciclo.test.ts`
Expected: FAIL with `Cannot find module '@/lib/ciclo'` (or similar — the file doesn't exist
yet).

- [ ] **Step 3: Implement `src/lib/ciclo.ts`**

```ts
export type Ciclo = {
  anoInicio: number;
  label: string;
  inicio: Date;
  fim: Date;
};

/**
 * O ciclo agrícola vai de 1º de maio a 30 de abril do ano seguinte. Datas de campos
 * "somente data" (<input type="date">) são meia-noite UTC em todo o app (ver format.ts) —
 * por isso usa sempre os getters UTC, nunca os locais.
 */
export function cicloDaData(data: Date): Ciclo {
  const mes = data.getUTCMonth() + 1; // 1-12
  const anoInicio = mes >= 5 ? data.getUTCFullYear() : data.getUTCFullYear() - 1;

  return {
    anoInicio,
    label: `${anoInicio}/${anoInicio + 1}`,
    inicio: new Date(Date.UTC(anoInicio, 4, 1)), // 1º de maio, 00:00 UTC
    fim: new Date(Date.UTC(anoInicio + 1, 3, 30, 23, 59, 59, 999)), // 30 de abril, fim do dia UTC
  };
}

export function cicloAtual(): Ciclo {
  return cicloDaData(new Date());
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/ciclo.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ciclo.ts src/lib/ciclo.test.ts
git commit -m "feat: add cicloDaData/cicloAtual (ciclo agrícola maio-abril)"
```

---

### Task 3: Contagem de aplicações por quadra e ciclo — `src/lib/limite-aplicacoes.ts`

**Files:**
- Create: `src/lib/limite-aplicacoes.ts`
- Test: `src/lib/limite-aplicacoes.test.ts`

**Interfaces:**
- Consumes: `cicloDaData` from `@/lib/ciclo` (Task 2); `db` from `@/lib/db` (existing).
- Produces:
  ```ts
  export type StatusCelula = "SEM_APLICACAO" | "DENTRO_LIMITE" | "NO_LIMITE" | "ACIMA_LIMITE";
  export function statusCelula(contagem: number, limite: number): StatusCelula;

  export type LinhaAplicacao = { operacaoId: string; produtoId: string; talhaoId: string; data: Date };
  export type ContagemChave = {
    produtoId: string;
    limite: number;
    porTalhaoECiclo: Record<string /* talhaoId */, Record<string /* cicloLabel */, number>>;
  };
  export function agruparContagensPorTalhaoECiclo(
    linhas: LinhaAplicacao[],
    produtosChave: { id: string; limite: number }[],
  ): ContagemChave[];

  export function ordenarCiclosDesc(labels: string[]): string[];

  export async function buscarContagensChaveParaFormulario(
    propriedadeId: string,
    excluirOperacaoId?: string,
  ): Promise<ContagemChave[]>;
  ```
  Consumed by Task 5 (resumo page) and Task 6 (form warning + its server pages).

- [ ] **Step 1: Write the failing tests for the pure functions**

Create `src/lib/limite-aplicacoes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  statusCelula,
  agruparContagensPorTalhaoECiclo,
  ordenarCiclosDesc,
} from "@/lib/limite-aplicacoes";

describe("statusCelula", () => {
  it("sem nenhuma aplicação retorna SEM_APLICACAO", () => {
    expect(statusCelula(0, 4)).toBe("SEM_APLICACAO");
  });

  it("abaixo do limite retorna DENTRO_LIMITE", () => {
    expect(statusCelula(2, 4)).toBe("DENTRO_LIMITE");
  });

  it("exatamente no limite retorna NO_LIMITE", () => {
    expect(statusCelula(4, 4)).toBe("NO_LIMITE");
  });

  it("acima do limite retorna ACIMA_LIMITE", () => {
    expect(statusCelula(5, 4)).toBe("ACIMA_LIMITE");
  });
});

describe("agruparContagensPorTalhaoECiclo", () => {
  it("conta uma aplicação por operação, agrupada por talhão e ciclo", () => {
    const resultado = agruparContagensPorTalhaoECiclo(
      [
        { operacaoId: "op1", produtoId: "prod1", talhaoId: "talhao1", data: new Date("2026-06-01T00:00:00.000Z") },
        { operacaoId: "op2", produtoId: "prod1", talhaoId: "talhao1", data: new Date("2026-07-01T00:00:00.000Z") },
        { operacaoId: "op3", produtoId: "prod1", talhaoId: "talhao2", data: new Date("2026-06-01T00:00:00.000Z") },
      ],
      [{ id: "prod1", limite: 4 }],
    );

    expect(resultado).toEqual([
      {
        produtoId: "prod1",
        limite: 4,
        porTalhaoECiclo: {
          talhao1: { "2026/2027": 2 },
          talhao2: { "2026/2027": 1 },
        },
      },
    ]);
  });

  it("não conta duas vezes a mesma operação+produto (linha duplicada)", () => {
    const resultado = agruparContagensPorTalhaoECiclo(
      [
        { operacaoId: "op1", produtoId: "prod1", talhaoId: "talhao1", data: new Date("2026-06-01T00:00:00.000Z") },
        { operacaoId: "op1", produtoId: "prod1", talhaoId: "talhao1", data: new Date("2026-06-01T00:00:00.000Z") },
      ],
      [{ id: "prod1", limite: 4 }],
    );

    expect(resultado[0].porTalhaoECiclo.talhao1["2026/2027"]).toBe(1);
  });

  it("separa aplicações em ciclos diferentes da mesma quadra", () => {
    const resultado = agruparContagensPorTalhaoECiclo(
      [
        { operacaoId: "op1", produtoId: "prod1", talhaoId: "talhao1", data: new Date("2026-04-30T00:00:00.000Z") },
        { operacaoId: "op2", produtoId: "prod1", talhaoId: "talhao1", data: new Date("2026-05-01T00:00:00.000Z") },
      ],
      [{ id: "prod1", limite: 4 }],
    );

    expect(resultado[0].porTalhaoECiclo.talhao1).toEqual({
      "2025/2026": 1,
      "2026/2027": 1,
    });
  });

  it("produto-chave sem nenhuma aplicação retorna um objeto vazio, não some da lista", () => {
    const resultado = agruparContagensPorTalhaoECiclo([], [{ id: "prod1", limite: 4 }]);
    expect(resultado).toEqual([{ produtoId: "prod1", limite: 4, porTalhaoECiclo: {} }]);
  });
});

describe("ordenarCiclosDesc", () => {
  it("ordena do ciclo mais recente para o mais antigo, sem duplicar", () => {
    expect(ordenarCiclosDesc(["2025/2026", "2027/2028", "2025/2026", "2026/2027"])).toEqual([
      "2027/2028",
      "2026/2027",
      "2025/2026",
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/limite-aplicacoes.test.ts`
Expected: FAIL with `Cannot find module '@/lib/limite-aplicacoes'`.

- [ ] **Step 3: Implement `src/lib/limite-aplicacoes.ts`**

```ts
import { db } from "@/lib/db";
import { cicloDaData } from "@/lib/ciclo";

export type StatusCelula = "SEM_APLICACAO" | "DENTRO_LIMITE" | "NO_LIMITE" | "ACIMA_LIMITE";

export function statusCelula(contagem: number, limite: number): StatusCelula {
  if (contagem === 0) return "SEM_APLICACAO";
  if (contagem < limite) return "DENTRO_LIMITE";
  if (contagem === limite) return "NO_LIMITE";
  return "ACIMA_LIMITE";
}

export type LinhaAplicacao = {
  operacaoId: string;
  produtoId: string;
  talhaoId: string;
  data: Date;
};

export type ContagemChave = {
  produtoId: string;
  limite: number;
  porTalhaoECiclo: Record<string, Record<string, number>>;
};

/**
 * Agrupa aplicações de produtos-chave por talhão e ciclo, contando operações distintas —
 * nunca soma de quantidade/volume. Deduplica por operação+produto, para o caso (raro) de
 * duas linhas do mesmo produto na mesma operação não contarem em dobro. Puro — sem acesso a
 * banco — para poder ser verificado isoladamente.
 */
export function agruparContagensPorTalhaoECiclo(
  linhas: LinhaAplicacao[],
  produtosChave: { id: string; limite: number }[],
): ContagemChave[] {
  const vistos = new Set<string>();
  const porProduto = new Map<string, Map<string, Map<string, number>>>();

  for (const linha of linhas) {
    const chaveUnica = `${linha.operacaoId}::${linha.produtoId}`;
    if (vistos.has(chaveUnica)) continue;
    vistos.add(chaveUnica);

    const cicloLabel = cicloDaData(linha.data).label;
    const porTalhao = porProduto.get(linha.produtoId) ?? new Map<string, Map<string, number>>();
    const porCiclo = porTalhao.get(linha.talhaoId) ?? new Map<string, number>();
    porCiclo.set(cicloLabel, (porCiclo.get(cicloLabel) ?? 0) + 1);
    porTalhao.set(linha.talhaoId, porCiclo);
    porProduto.set(linha.produtoId, porTalhao);
  }

  return produtosChave.map((produto) => {
    const porTalhao = porProduto.get(produto.id) ?? new Map<string, Map<string, number>>();
    return {
      produtoId: produto.id,
      limite: produto.limite,
      porTalhaoECiclo: Object.fromEntries(
        Array.from(porTalhao.entries()).map(([talhaoId, porCiclo]) => [
          talhaoId,
          Object.fromEntries(porCiclo),
        ]),
      ),
    };
  });
}

/** Ordena rótulos de ciclo ("2026/2027") do mais recente para o mais antigo, sem duplicar. */
export function ordenarCiclosDesc(labels: string[]): string[] {
  return Array.from(new Set(labels)).sort((a, b) => b.localeCompare(a));
}

/**
 * Busca, para a propriedade atual, a contagem de aplicações por talhão e ciclo de cada
 * produto-chave (limiteAplicacoesCiclo preenchido). Usada tanto pela tela-resumo quanto pelo
 * formulário de tratamento (que passa excluirOperacaoId no modo editar, para a operação
 * atual não se contar contra o próprio limite).
 */
export async function buscarContagensChaveParaFormulario(
  propriedadeId: string,
  excluirOperacaoId?: string,
): Promise<ContagemChave[]> {
  const produtosChave = await db.produto.findMany({
    where: { propriedadeId, ativo: true, limiteAplicacoesCiclo: { not: null } },
    select: { id: true, limiteAplicacoesCiclo: true },
  });
  if (produtosChave.length === 0) return [];

  const linhas = await db.operacaoProduto.findMany({
    where: {
      produtoId: { in: produtosChave.map((p) => p.id) },
      operacao: {
        talhao: { propriedadeId },
        ...(excluirOperacaoId ? { id: { not: excluirOperacaoId } } : {}),
      },
    },
    select: {
      produtoId: true,
      operacaoId: true,
      operacao: { select: { talhaoId: true, data: true } },
    },
  });

  return agruparContagensPorTalhaoECiclo(
    linhas.map((linha) => ({
      operacaoId: linha.operacaoId,
      produtoId: linha.produtoId,
      talhaoId: linha.operacao.talhaoId,
      data: linha.operacao.data,
    })),
    produtosChave.map((p) => ({ id: p.id, limite: p.limiteAplicacoesCiclo! })),
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/limite-aplicacoes.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/limite-aplicacoes.ts src/lib/limite-aplicacoes.test.ts
git commit -m "feat: add contagem de aplicações por talhão/ciclo (limite-aplicacoes)"
```

---

### Task 4: Cadastrar o limite no formulário de produto

**Files:**
- Modify: `src/components/estoque/produto-form.tsx` (full file, 105 lines)
- Modify: `src/actions/estoque.ts:10-63` (`parseProdutoForm`, `criarProduto`, `atualizarProduto`)
- Modify: `src/app/(app)/estoque/produtos/[id]/editar/page.tsx:40-45` (`defaultValues`)

**Interfaces:**
- Consumes: nothing new from earlier tasks (Task 1's DB column only).
- Produces: `Produto.limiteAplicacoesCiclo` becomes settable from the UI. Task 5 and Task 6
  rely on this being populated to have anything to show.

- [ ] **Step 1: Add the field to `ProdutoFormValues` and render the input**

In `src/components/estoque/produto-form.tsx`, update the type (currently lines 6-11):

```ts
type ProdutoFormValues = {
  nome: string;
  unidade: string;
  unidadeDosagem: string;
  limiteAplicacoesCiclo: string;
  observacoes: string;
};
```

Insert a new field block between the `unidadeDosagem` `<div>` (ends around line 78) and the
`observacoes` `<div>` (currently starting at line 80):

```tsx
      <div>
        <label htmlFor="limiteAplicacoesCiclo" className="mb-1 block text-sm font-medium text-neutral-700">
          Máximo de aplicações por ciclo
        </label>
        <input
          id="limiteAplicacoesCiclo"
          name="limiteAplicacoesCiclo"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          defaultValue={defaultValues?.limiteAplicacoesCiclo}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Se preenchido, este produto aparece no Resumo do ciclo em Tratamentos, comparando o
          número de aplicações em cada quadra com este limite.
        </p>
      </div>
```

- [ ] **Step 2: Persist the field in the server actions**

In `src/actions/estoque.ts`, replace `parseProdutoForm` (currently lines 10-18):

```ts
function parseProdutoForm(formData: FormData) {
  const unidadeDosagemRaw = String(formData.get("unidadeDosagem") ?? "");
  const limiteRaw = String(formData.get("limiteAplicacoesCiclo") ?? "").trim();
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    unidade: String(formData.get("unidade") ?? "").trim(),
    unidadeDosagem: (unidadeDosagemRaw || null) as UnidadeDosagem | null,
    limiteAplicacoesCiclo: limiteRaw ? Number(limiteRaw) : null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}
```

Add the same validation to both `criarProduto` and `atualizarProduto`, right after the
existing `unidadeDosagem` validation (after line 31 in `criarProduto`, after line 52 in
`atualizarProduto`):

```ts
  if (
    dados.limiteAplicacoesCiclo !== null &&
    (!Number.isInteger(dados.limiteAplicacoesCiclo) || dados.limiteAplicacoesCiclo <= 0)
  ) {
    return "Máximo de aplicações por ciclo deve ser um número inteiro maior que zero.";
  }
```

No other change is needed in either function — both already do
`db.produto.create({ data: { ...dados, propriedadeId } })` /
`db.produto.update({ where: { id: produtoId }, data: dados })`, which will now include
`limiteAplicacoesCiclo` automatically since it's part of `dados`.

- [ ] **Step 3: Pass the current value on the edit page**

In `src/app/(app)/estoque/produtos/[id]/editar/page.tsx`, update the `defaultValues` prop
(currently lines 40-45):

```tsx
        defaultValues={{
          nome: produto.nome,
          unidade: produto.unidade,
          unidadeDosagem: produto.unidadeDosagem ?? "",
          limiteAplicacoesCiclo: produto.limiteAplicacoesCiclo?.toString() ?? "",
          observacoes: produto.observacoes ?? "",
        }}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification in the browser**

Start the dev server (`preview_start` with the project's `dev` config, or `npm run dev`).
1. Go to `/estoque/produtos/novo`, create a test product with "Máximo de aplicações por
   ciclo" = `4`. Confirm it saves without error.
2. Open that product's edit page (`/estoque/produtos/[id]/editar`) — confirm the field shows
   `4`.
3. Clear the field and save — confirm it saves as empty (no error), then reopen and confirm
   it's blank again (persisted as `null`).
4. Try entering `0` or `-1` — confirm the validation error appears and nothing saves.

- [ ] **Step 6: Commit**

```bash
git add src/components/estoque/produto-form.tsx src/actions/estoque.ts \
  "src/app/(app)/estoque/produtos/[id]/editar/page.tsx"
git commit -m "feat: cadastrar máximo de aplicações por ciclo no produto"
```

---

### Task 5: Tela "Resumo do ciclo" (matriz quadra × produto)

**Files:**
- Create: `src/app/(app)/tratamentos/resumo/page.tsx`
- Modify: `src/app/(app)/tratamentos/page.tsx:53-63` (add the "Resumo do ciclo" link)

**Interfaces:**
- Consumes: `cicloAtual` (Task 2); `statusCelula`, `ordenarCiclosDesc`,
  `buscarContagensChaveParaFormulario` (Task 3); `exigirPropriedadeAtual` (existing,
  `@/lib/propriedade`); `VoltarLink` (existing, `@/components/nav/voltar-link`).
- Produces: route `/tratamentos/resumo?ciclo=<label>`.

- [ ] **Step 1: Create the resumo page**

Create `src/app/(app)/tratamentos/resumo/page.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { VoltarLink } from "@/components/nav/voltar-link";
import { cicloAtual } from "@/lib/ciclo";
import {
  buscarContagensChaveParaFormulario,
  ordenarCiclosDesc,
  statusCelula,
  type StatusCelula,
} from "@/lib/limite-aplicacoes";

const CORES_STATUS: Record<StatusCelula, string> = {
  SEM_APLICACAO: "bg-neutral-100 text-neutral-500",
  DENTRO_LIMITE: "bg-green-100 text-green-700",
  NO_LIMITE: "bg-amber-100 text-amber-700",
  ACIMA_LIMITE: "bg-red-100 text-red-700",
};

export default async function ResumoCicloPage({
  searchParams,
}: {
  searchParams: Promise<{ ciclo?: string }>;
}) {
  const { ciclo: cicloParam } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const [talhoes, produtosChave, contagens] = await Promise.all([
    db.talhao.findMany({
      where: { propriedadeId },
      orderBy: { nomeCodinome: "asc" },
      select: { id: true, nomeCodinome: true },
    }),
    db.produto.findMany({
      where: { propriedadeId, ativo: true, limiteAplicacoesCiclo: { not: null } },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, limiteAplicacoesCiclo: true },
    }),
    buscarContagensChaveParaFormulario(propriedadeId),
  ]);

  const cicloAtualLabel = cicloAtual().label;
  const labelsComDados = contagens.flatMap((contagem) =>
    Object.values(contagem.porTalhaoECiclo).flatMap((porCiclo) => Object.keys(porCiclo)),
  );
  const ciclosDisponiveis = ordenarCiclosDesc([cicloAtualLabel, ...labelsComDados]);
  const cicloSelecionado =
    cicloParam && ciclosDisponiveis.includes(cicloParam) ? cicloParam : cicloAtualLabel;

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/tratamentos" label="Voltar aos tratamentos" />
      <h1 className="text-xl font-semibold text-neutral-900">Resumo do ciclo</h1>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {ciclosDisponiveis.map((label) => (
          <Link
            key={label}
            href={`/tratamentos/resumo?ciclo=${label}`}
            className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium ${
              cicloSelecionado === label
                ? "border-green-700 bg-green-700 text-white"
                : "border-neutral-300 bg-white text-neutral-700"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {produtosChave.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum produto com limite de aplicações cadastrado. Defina em Estoque → editar
          produto.
        </p>
      ) : talhoes.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma quadra cadastrada ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
                <th className="px-4 py-2 font-normal">Quadra</th>
                {produtosChave.map((produto) => (
                  <th key={produto.id} className="px-4 py-2 font-normal">
                    {produto.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {talhoes.map((talhao) => (
                <tr key={talhao.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2 font-medium text-neutral-900">{talhao.nomeCodinome}</td>
                  {produtosChave.map((produto) => {
                    const contagemProduto = contagens.find((c) => c.produtoId === produto.id);
                    const contagem = contagemProduto?.porTalhaoECiclo[talhao.id]?.[cicloSelecionado] ?? 0;
                    const limite = produto.limiteAplicacoesCiclo!;
                    const status = statusCelula(contagem, limite);
                    return (
                      <td key={produto.id} className="px-4 py-2">
                        <span
                          className={`inline-block rounded px-2 py-1 text-xs font-medium ${CORES_STATUS[status]}`}
                        >
                          {contagem}/{limite}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Link it from the Tratamentos list**

In `src/app/(app)/tratamentos/page.tsx`, replace the header block (currently lines 53-63):

```tsx
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Tratamentos Fitossanitários</h1>
        <div className="flex gap-2">
          <Link
            href="/tratamentos/resumo"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            Resumo do ciclo
          </Link>
          <Link
            href={`/tratamentos/nova${talhaoSelecionado ? `?talhaoId=${talhaoSelecionado}` : ""}`}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
          >
            + Novo tratamento
          </Link>
        </div>
      </div>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification in the browser**

1. On the product from Task 4 (limite `4`), go to `/tratamentos/nova` and register 2-3
   treatments for it in the same quadra, with a date inside the current cycle.
2. Open `/tratamentos/resumo` from the "Resumo do ciclo" button. Confirm:
   - The product appears as a column, the quadra as a row.
   - The cell shows the right count, e.g. `3/4`, colored green (`DENTRO_LIMITE`).
   - A quadra with zero treatments for that product shows `0/4`, colored gray.
3. Register one more treatment to hit exactly 4 — confirm the cell turns amber (`4/4`).
4. Register a 5th — confirm it turns red (`5/4`).
5. Click a past cycle tab (or navigate to `/tratamentos/resumo?ciclo=2024/2025`) — confirm
   it shows `0/4` for everything if there's no data there, without erroring.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/tratamentos/resumo/page.tsx" "src/app/(app)/tratamentos/page.tsx"
git commit -m "feat: tela Resumo do ciclo (matriz quadra x produto-chave)"
```

---

### Task 6: Aviso no formulário de tratamento

**Files:**
- Modify: `src/components/operacoes/operacao-form.tsx` (full file, 464 lines)
- Modify: `src/app/(app)/tratamentos/nova/page.tsx` (full file, 71 lines)
- Modify: `src/app/(app)/tratamentos/[id]/editar/page.tsx` (full file, 73 lines)

**Interfaces:**
- Consumes: `cicloDaData` (Task 2); `ContagemChave`, `buscarContagensChaveParaFormulario`
  (Task 3).
- Produces: nothing consumed by later tasks (this is the last task).

- [ ] **Step 1: Fetch and pass `contagensChave` from `/tratamentos/nova`**

In `src/app/(app)/tratamentos/nova/page.tsx`, add the import and include the new query in
the existing `Promise.all` (currently lines 13-34):

```tsx
import { buscarContagensChaveParaFormulario } from "@/lib/limite-aplicacoes";

// ...

  const [talhoes, produtos, operadores, maquinas, contagensChave] = await Promise.all([
    db.talhao.findMany({
      where: { propriedadeId },
      orderBy: { nomeCodinome: "asc" },
      select: { id: true, nomeCodinome: true, areaHa: true },
    }),
    db.produto.findMany({
      where: { propriedadeId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, unidade: true, unidadeDosagem: true },
    }),
    db.operador.findMany({
      where: { propriedadeId, ativo: true },
      orderBy: { nomeCompleto: "asc" },
      select: { id: true, nomeCompleto: true },
    }),
    db.maquina.findMany({
      where: { propriedadeId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    buscarContagensChaveParaFormulario(propriedadeId),
  ]);
```

Then pass it to `<OperacaoForm>` (currently lines 61-67):

```tsx
      <OperacaoForm
        talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nomeCodinome, areaHa: t.areaHa ? Number(t.areaHa) : null }))}
        produtos={produtos}
        operadores={operadores.map((o) => ({ id: o.id, nome: o.nomeCompleto }))}
        maquinas={maquinas}
        contagensChave={contagensChave}
        talhaoIdInicial={talhoes.some((t) => t.id === talhaoId) ? talhaoId : undefined}
      />
```

- [ ] **Step 2: Fetch and pass `contagensChave` (excluding the current operation) from the edit page**

In `src/app/(app)/tratamentos/[id]/editar/page.tsx`, add the import and query, excluding the
operation being edited so it doesn't count against its own limit:

```tsx
import { buscarContagensChaveParaFormulario } from "@/lib/limite-aplicacoes";

// ...

  const [talhoes, produtos, operadores, maquinas, contagensChave] = await Promise.all([
    db.talhao.findMany({
      where: { propriedadeId },
      orderBy: { nomeCodinome: "asc" },
      select: { id: true, nomeCodinome: true, areaHa: true },
    }),
    db.produto.findMany({
      where: {
        propriedadeId,
        OR: [{ ativo: true }, { id: { in: operacao.produtos.map((p) => p.produtoId) } }],
      },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, unidade: true, unidadeDosagem: true },
    }),
    db.operador.findMany({
      where: { propriedadeId, ativo: true },
      orderBy: { nomeCompleto: "asc" },
      select: { id: true, nomeCompleto: true },
    }),
    db.maquina.findMany({ where: { propriedadeId }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    buscarContagensChaveParaFormulario(propriedadeId, operacao.id),
  ]);
```

Then pass it to `<OperacaoForm>` alongside the other props (currently lines 46-52), adding
`contagensChave={contagensChave}`.

- [ ] **Step 3: Accept `contagensChave` and lift `data` into state in `OperacaoForm`**

In `src/components/operacoes/operacao-form.tsx`, add imports at the top (after the existing
imports, currently ending at line 11):

```ts
import { cicloDaData } from "@/lib/ciclo";
import type { ContagemChave } from "@/lib/limite-aplicacoes";
```

Update the props type (currently lines 43-61) to add `contagensChave`:

```tsx
export function OperacaoForm({
  talhoes,
  produtos,
  operadores,
  maquinas,
  contagensChave,
  talhaoIdInicial,
  modo = "criar",
  operacaoId,
  valoresIniciais,
}: {
  talhoes: TalhaoOpcao[];
  produtos: ProdutoOpcao[];
  operadores: Opcao[];
  maquinas: Opcao[];
  contagensChave: ContagemChave[];
  talhaoIdInicial?: string;
  modo?: "criar" | "editar";
  operacaoId?: string;
  valoresIniciais?: ValoresIniciaisOperacao;
}) {
```

Add a controlled `data` state right after the existing `talhaoId` state (currently line 65):

```ts
  const [talhaoId, setTalhaoId] = useState(valoresIniciais?.talhaoId ?? talhaoIdInicial ?? "");
  const [data, setData] = useState(valoresIniciais?.data ?? new Date().toISOString().slice(0, 10));
```

Replace the (currently uncontrolled) date input block (currently lines 106-118):

```tsx
        <div>
          <label htmlFor="data" className="mb-1 block text-sm font-medium text-neutral-700">
            Data *
          </label>
          <input
            id="data"
            name="data"
            type="date"
            required
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
```

- [ ] **Step 4: Pass `talhaoId`, `data`, `contagensChave` down to each `LinhaProduto`**

Update the `linhas.map` block (currently lines 181-195):

```tsx
          {linhas.map((linha) => (
            <LinhaProduto
              key={linha.chave}
              tipo={tipo}
              produtos={produtos}
              volumeCalda={usaCalda && volumeCalda ? Number(volumeCalda) : null}
              areaHa={areaHa}
              talhaoId={talhaoId}
              data={data}
              contagensChave={contagensChave}
              valorInicial={linha.valorInicial}
              onRemover={
                linhas.length > 1
                  ? () => setLinhas((atual) => atual.filter((l) => l.chave !== linha.chave))
                  : undefined
              }
            />
          ))}
```

- [ ] **Step 5: Compute and render the warning in `LinhaProduto`**

Update the `LinhaProduto` signature (currently lines 342-356):

```tsx
function LinhaProduto({
  tipo,
  produtos,
  volumeCalda,
  areaHa,
  talhaoId,
  data,
  contagensChave,
  onRemover,
  valorInicial,
}: {
  tipo: TipoOperacao;
  produtos: ProdutoOpcao[];
  volumeCalda: number | null;
  areaHa: number | null;
  talhaoId: string;
  data: string;
  contagensChave: ContagemChave[];
  onRemover?: () => void;
  valorInicial?: ProdutoLancado;
}) {
```

Add the warning computation right after the existing `quantidade` calculation (currently
ending at line 377, before the `return (`):

```ts
  const contagemChave = contagensChave.find((c) => c.produtoId === produtoId);
  const cicloLabel = cicloDaData(new Date(data)).label;
  const contagemAtual = contagemChave ? contagemChave.porTalhaoECiclo[talhaoId]?.[cicloLabel] ?? 0 : 0;
  const excedeuLimite = contagemChave !== undefined && talhaoId !== "" && contagemAtual >= contagemChave.limite;
```

Render it as the first thing inside the outer wrapper `<div>` (currently starting at line
380), right after the `<div className="flex items-end gap-2">...</div>` row closes (after
line 437, before the `{ehAdubacao && produto && (...)}` block):

```tsx
      {excedeuLimite && contagemChave && (
        <p className="mt-1 text-xs font-medium text-amber-600">
          ⚠️ Este produto já tem {contagemAtual} de {contagemChave.limite} aplicações nesta
          quadra neste ciclo.
        </p>
      )}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (If `data` being controlled causes a "value without onChange" style
warning elsewhere, there is none — the input already gets `onChange`.)

- [ ] **Step 7: Manual verification in the browser**

Using the same test product (limite `4`) and quadra from Task 5, which should already be at
or above the limit there:

1. Go to `/tratamentos/nova`, pick that quadra and that product, leave today's date (current
   cycle). Confirm the amber warning "⚠️ Este produto já tem X de 4 aplicações..." appears
   as soon as both quadra and product are selected.
2. Change the product to one without a limit set — confirm the warning disappears.
3. Change the date to a date in the *previous* cycle (before May 1st of the current cycle's
   start year) — confirm the warning disappears (or shows a different, lower count if that
   past cycle also has treatments).
4. Submit the form anyway with the warning showing — confirm it saves successfully (the
   warning never blocks submission).
5. Open that treatment's edit page (`/tratamentos/[id]/editar`) — confirm the warning still
   shows correctly and, critically, that editing and re-saving *without changing anything*
   doesn't make the count creep up (it should stay excluded from its own count both before
   and after saving).

- [ ] **Step 8: Run the full test suite one more time**

Run: `npx vitest run`
Expected: all tests pass (including the pre-existing ones untouched by this plan).

- [ ] **Step 9: Commit**

```bash
git add src/components/operacoes/operacao-form.tsx \
  "src/app/(app)/tratamentos/nova/page.tsx" \
  "src/app/(app)/tratamentos/[id]/editar/page.tsx"
git commit -m "feat: avisar no formulário de tratamento quando o limite do ciclo é atingido"
```
