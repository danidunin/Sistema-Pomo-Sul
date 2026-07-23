# Controle de Chuva — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Controle de Chuva" tab (manual pluviômetro readings), show a live-computed
accumulated-rain badge above each fitossanitário treatment, and add a talhão-less "Chuva"
activity type to Horas-Homem.

**Architecture:** Next.js App Router + Server Actions + Prisma 7/PostgreSQL, following this
codebase's existing CRUD module pattern (see `src/app/(app)/diesel`, `src/app/(app)/estoque`).
Accumulated rain per treatment is computed live at read time from raw dates — nothing is
stored or cached, so it's always correct even with retroactive rain entries.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Prisma 7 (`@prisma/adapter-pg`),
PostgreSQL, Tailwind, lucide-react icons. No test framework exists in this project
(no vitest/jest, no `*.test.ts` files) — verification is `npx tsc --noEmit`,
`npx next build --webpack`, and manual browser testing, matching how the rest of the app is
verified. Where a piece of logic is pure and worth sanity-checking in isolation (the rain
accumulation calculation), we run it once with `npx tsx` against throwaway inline data and then
delete the throwaway script — do not leave scratch scripts in the repo.

## Global Constraints

- Migrations are always hand-written, additive SQL in `prisma/migrations/<timestamp>_name/migration.sql`
  — never a generated/destructive migration. This project's database has real farm data since
  day one.
- Delete confirmation is always the inline two-step `ConfirmarExclusao` component
  (`src/components/ui/confirmar-exclusao.tsx`) — never `window.confirm()`.
- Every Server Action that receives an ID from a form/URL must verify the record belongs to
  the current `propriedadeId` (`src/lib/propriedade.ts` `garantir*DaPropriedade` helpers)
  before reading or writing.
- Form components follow the `action` / `defaultValues` / `submitLabel` pattern already used
  throughout the app (see `src/components/atividades/atividade-form.tsx`).
- Dates from `<input type="date">` are UTC-midnight `Date` objects; always format with
  `formatarData()` (`src/lib/format.ts`), which forces `timeZone: "UTC"`.
- **The local dev database is the same database used by the `next dev` server the farm may be
  using for real (port 3000).** The migration in Task 1 is purely additive (new table, new
  nullable/backfilled column) and safe to apply, but confirm no one is mid-form-submission
  before running it, same as any other schema change in this project.

---

### Task 1: Schema — `ChuvaRegistro` table + optional talhão on `Atividade`

**Files:**
- Modify: `prisma/schema.prisma` (Atividade model at line 285, Propriedade model at line 17,
  end of file after line 469)
- Create: `prisma/migrations/20260723020000_controle_chuva/migration.sql`

**Interfaces:**
- Produces: Prisma models `ChuvaRegistro` (fields: `id`, `propriedadeId`, `data`,
  `quantidadeMm`, `relacaoTratamentoDia: RelacaoTratamentoDia | null`, `observacoes`,
  `createdAt`, `updatedAt`) and enum `RelacaoTratamentoDia` (`ANTES` | `DEPOIS`), importable
  from `@/generated/prisma/client` and `@/generated/prisma/enums` after `prisma generate`.
  `Atividade.talhaoId` becomes `String | null`, `Atividade.propriedadeId` becomes a new
  required `String` field.

- [ ] **Step 1: Edit the `Atividade` model in `prisma/schema.prisma`**

Replace (currently lines 285–301):

```prisma
model Atividade {
  id              String        @id @default(cuid())
  data            DateTime
  tipoAtividade   TipoAtividade @relation(fields: [tipoAtividadeId], references: [id])
  tipoAtividadeId String        @map("tipo_atividade_id")
  talhao          Talhao        @relation(fields: [talhaoId], references: [id])
  talhaoId        String        @map("talhao_id")
  numeroPessoas   Int           @map("numero_pessoas")
  horasPorPessoa  Decimal       @map("horas_por_pessoa") @db.Decimal(6, 2)
  horasMaquina    Decimal?      @map("horas_maquina") @db.Decimal(6, 2)
  observacoes     String?
  fotoUrl         String?       @map("foto_url")
  createdAt       DateTime      @default(now()) @map("created_at")

  @@index([talhaoId, data])
  @@map("atividades")
}
```

with:

```prisma
model Atividade {
  id              String        @id @default(cuid())
  data            DateTime
  tipoAtividade   TipoAtividade @relation(fields: [tipoAtividadeId], references: [id])
  tipoAtividadeId String        @map("tipo_atividade_id")
  propriedade     Propriedade   @relation(fields: [propriedadeId], references: [id])
  propriedadeId   String        @map("propriedade_id")
  talhao          Talhao?       @relation(fields: [talhaoId], references: [id])
  talhaoId        String?       @map("talhao_id")
  numeroPessoas   Int           @map("numero_pessoas")
  horasPorPessoa  Decimal       @map("horas_por_pessoa") @db.Decimal(6, 2)
  horasMaquina    Decimal?      @map("horas_maquina") @db.Decimal(6, 2)
  observacoes     String?
  fotoUrl         String?       @map("foto_url")
  createdAt       DateTime      @default(now()) @map("created_at")

  @@index([talhaoId, data])
  @@index([propriedadeId, data])
  @@map("atividades")
}
```

`propriedadeId` is added directly (not derived only through `talhao`) because the "Chuva"
activity type has no talhão — every other propriedade-ownership check in this codebase
(`garantir*DaPropriedade` in `src/lib/propriedade.ts`) assumes it can reach `propriedadeId`
through a required relation, which no longer holds once `talhao` is optional.

- [ ] **Step 2: Add relations to `Propriedade` and append the new models in `prisma/schema.prisma`**

In the `Propriedade` model (currently lines 17–30), add two lines to the relations block so it
reads:

```prisma
model Propriedade {
  id        String   @id @default(cuid())
  nome      String   @unique
  createdAt DateTime @default(now()) @map("created_at")

  talhoes         Talhao[]
  maquinas        Maquina[]
  operadores      Operador[]
  produtos        Produto[]
  contagensFrutos ContagemFrutos[]
  tanquesDiesel   TanqueDiesel[]
  atividades      Atividade[]
  chuvaRegistros  ChuvaRegistro[]

  @@map("propriedades")
}
```

At the end of `prisma/schema.prisma` (after the `DieselMovimentacao` model, currently ending at
line 469), append:

```prisma

// ---------------------------------------------------------------------------
// Controle de Chuva — leitura manual de pluviômetro, única por propriedade
// (não há leitura por talhão)
// ---------------------------------------------------------------------------

model ChuvaRegistro {
  id                   String                @id @default(cuid())
  propriedade          Propriedade           @relation(fields: [propriedadeId], references: [id])
  propriedadeId        String                @map("propriedade_id")
  data                 DateTime
  quantidadeMm         Decimal               @map("quantidade_mm") @db.Decimal(6, 2)
  relacaoTratamentoDia RelacaoTratamentoDia? @map("relacao_tratamento_dia")
  observacoes          String?
  createdAt            DateTime              @default(now()) @map("created_at")
  updatedAt            DateTime              @updatedAt @map("updated_at")

  @@index([propriedadeId, data])
  @@map("chuva_registros")
}

enum RelacaoTratamentoDia {
  ANTES
  DEPOIS
}
```

- [ ] **Step 3: Write the hand-written migration**

Create `prisma/migrations/20260723020000_controle_chuva/migration.sql`:

```sql
-- Atividade: talhão passa a ser opcional. A atividade "Chuva" (Horas-Homem) registra uma
-- parada geral da equipe, sem vínculo com um talhão específico. Como todo o resto do sistema
-- deriva propriedadeId através do talhão, adicionamos propriedade_id diretamente na tabela e
-- fazemos o backfill a partir do talhão atual de cada linha existente.

ALTER TABLE "atividades" ADD COLUMN "propriedade_id" TEXT;

UPDATE "atividades" a
SET "propriedade_id" = t."propriedade_id"
FROM "talhoes" t
WHERE t."id" = a."talhao_id";

ALTER TABLE "atividades" ALTER COLUMN "propriedade_id" SET NOT NULL;
ALTER TABLE "atividades" ALTER COLUMN "talhao_id" DROP NOT NULL;

CREATE INDEX "atividades_propriedade_id_idx" ON "atividades"("propriedade_id");

ALTER TABLE "atividades" ADD CONSTRAINT "atividades_propriedade_id_fkey" FOREIGN KEY ("propriedade_id") REFERENCES "propriedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Controle de Chuva: leitura manual de pluviômetro, única por propriedade.

CREATE TYPE "RelacaoTratamentoDia" AS ENUM ('ANTES', 'DEPOIS');

CREATE TABLE "chuva_registros" (
    "id" TEXT NOT NULL,
    "propriedade_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "quantidade_mm" DECIMAL(6,2) NOT NULL,
    "relacao_tratamento_dia" "RelacaoTratamentoDia",
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chuva_registros_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chuva_registros_propriedade_id_data_idx" ON "chuva_registros"("propriedade_id", "data");

ALTER TABLE "chuva_registros" ADD CONSTRAINT "chuva_registros_propriedade_id_fkey" FOREIGN KEY ("propriedade_id") REFERENCES "propriedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 4: Apply the migration and regenerate the Prisma client**

Run: `npx prisma migrate deploy && npx prisma generate`
Expected: output lists `20260723020000_controle_chuva` as applied, then
"Generated Prisma Client".

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: a list of errors in files that access `atividade.talhao.propriedadeId` or similar
without a null check (`src/lib/propriedade.ts`, `src/actions/atividades.ts`,
`src/app/(app)/atividades/**`, `src/lib/relatorios.ts`, `src/app/api/export/atividades/route.ts`).
This is expected — Tasks 9 and 10 fix every one of these. Confirm the error list only touches
those files (nothing unrelated broke), then continue.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260723020000_controle_chuva
git commit -m "Adiciona tabela de Controle de Chuva e torna talhão opcional em Atividade"
```

---

### Task 2: Seed — tipo de atividade "Chuva"

**Files:**
- Modify: `prisma/seed.ts:8-19`

**Interfaces:**
- Produces: a `TipoAtividade` row with `nome: "Chuva"`, reachable by other tasks via
  `db.tipoAtividade.findMany(...)`.

- [ ] **Step 1: Add "Chuva" to the seed list**

Replace:

```ts
const TIPOS_ATIVIDADE = [
  "Roçar",
  "Triturar galhos",
  "Colher",
  "Podar",
  "Ralear",
  "Arquear galhos",
  "Cortar cavalos",
  "Plantio",
  "Replantio",
  "Outros",
];
```

with:

```ts
const TIPOS_ATIVIDADE = [
  "Roçar",
  "Triturar galhos",
  "Colher",
  "Podar",
  "Ralear",
  "Arquear galhos",
  "Cortar cavalos",
  "Plantio",
  "Replantio",
  "Chuva",
  "Outros",
];
```

- [ ] **Step 2: Run the seed**

Run: `npx tsx prisma/seed.ts`
Expected: no errors (the `upsert` is idempotent — safe to re-run against a database that
already has the other seed rows).

- [ ] **Step 3: Verify the row exists**

Run:
```bash
npx tsx -e "
import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
db.tipoAtividade.findUnique({ where: { nome: 'Chuva' } }).then((r) => { console.log(r); process.exit(0); });
"
```
Expected: prints a row with `nome: 'Chuva'`.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "Adiciona tipo de atividade Chuva ao seed"
```

---

### Task 3: `src/lib/propriedade.ts` — ownership helpers

**Files:**
- Modify: `src/lib/propriedade.ts:71-77` (`garantirAtividadeDaPropriedade`)
- Modify: `src/lib/propriedade.ts` (append new helper after `garantirTanqueDaPropriedade`, line 90)

**Interfaces:**
- Produces: `garantirAtividadeDaPropriedade(atividadeId: string, propriedadeId: string): Promise<boolean>`
  (now checks the direct field, works for talhão-less atividades) and
  `garantirChuvaDaPropriedade(chuvaId: string, propriedadeId: string): Promise<boolean>`.

- [ ] **Step 1: Simplify `garantirAtividadeDaPropriedade`**

Replace:

```ts
export async function garantirAtividadeDaPropriedade(atividadeId: string, propriedadeId: string): Promise<boolean> {
  const atividade = await db.atividade.findUnique({
    where: { id: atividadeId },
    select: { talhao: { select: { propriedadeId: true } } },
  });
  return atividade?.talhao.propriedadeId === propriedadeId;
}
```

with:

```ts
export async function garantirAtividadeDaPropriedade(atividadeId: string, propriedadeId: string): Promise<boolean> {
  const atividade = await db.atividade.findUnique({ where: { id: atividadeId }, select: { propriedadeId: true } });
  return atividade?.propriedadeId === propriedadeId;
}
```

- [ ] **Step 2: Add `garantirChuvaDaPropriedade`**

Append after `garantirTanqueDaPropriedade` (end of file):

```ts

export async function garantirChuvaDaPropriedade(chuvaId: string, propriedadeId: string): Promise<boolean> {
  const chuva = await db.chuvaRegistro.findUnique({ where: { id: chuvaId }, select: { propriedadeId: true } });
  return chuva?.propriedadeId === propriedadeId;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: the two errors that were in `src/lib/propriedade.ts` are gone; remaining errors are
only in the files Tasks 9–10 will fix.

- [ ] **Step 4: Commit**

```bash
git add src/lib/propriedade.ts
git commit -m "Ajusta checagem de propriedade da Atividade e adiciona checagem de Chuva"
```

---

### Task 4: `src/lib/chuva.ts` — queries and accumulation calculation

**Files:**
- Create: `src/lib/chuva.ts`

**Interfaces:**
- Consumes: `db` from `@/lib/db`, `ChuvaRegistro` type from `@/generated/prisma/client`.
- Produces:
  - `buscarChuvaRegistros(propriedadeId: string): Promise<ChuvaRegistro[]>`
  - `buscarDatasComTratamentoFitossanitario(propriedadeId: string): Promise<string[]>`
    (ISO `YYYY-MM-DD` strings)
  - `calcularAcumuladoPorTratamento(operacoes: OperacaoParaAcumulo[], chuvas: ChuvaParaAcumulo[]): Map<string, number>`
    — pure function, no DB access, used by Task 8.

- [ ] **Step 1: Write `src/lib/chuva.ts`**

```ts
import { db } from "@/lib/db";

export async function buscarChuvaRegistros(propriedadeId: string) {
  return db.chuvaRegistro.findMany({
    where: { propriedadeId },
    orderBy: { data: "desc" },
  });
}

export async function buscarDatasComTratamentoFitossanitario(propriedadeId: string): Promise<string[]> {
  const operacoes = await db.operacaoAgricola.findMany({
    where: { tipo: "FITOSSANITARIO", talhao: { propriedadeId } },
    select: { data: true },
  });
  const datas = new Set(operacoes.map((o) => o.data.toISOString().slice(0, 10)));
  return Array.from(datas);
}

export type OperacaoParaAcumulo = {
  id: string;
  talhaoId: string;
  data: Date;
  createdAt: Date;
};

export type ChuvaParaAcumulo = {
  data: Date;
  quantidadeMm: number | string;
  relacaoTratamentoDia: "ANTES" | "DEPOIS" | null;
};

/**
 * Para cada tratamento fitossanitário, soma a chuva registrada desde ele até o próximo
 * tratamento do mesmo talhão (ou até hoje, se for o mais recente). Chuva no mesmo dia do
 * tratamento atual só conta se marcada "DEPOIS"; chuva no mesmo dia do próximo tratamento
 * conta pelo atual a não ser que esteja marcada "DEPOIS" (nesse caso conta pelo próximo).
 * Puro — sem acesso a banco — para poder ser verificado isoladamente.
 */
export function calcularAcumuladoPorTratamento(
  operacoes: OperacaoParaAcumulo[],
  chuvas: ChuvaParaAcumulo[],
): Map<string, number> {
  const porTalhao = new Map<string, OperacaoParaAcumulo[]>();
  for (const op of operacoes) {
    const lista = porTalhao.get(op.talhaoId) ?? [];
    lista.push(op);
    porTalhao.set(op.talhaoId, lista);
  }

  const resultado = new Map<string, number>();

  for (const lista of porTalhao.values()) {
    const ordenada = [...lista].sort((a, b) => {
      const diff = a.data.getTime() - b.data.getTime();
      return diff !== 0 ? diff : a.createdAt.getTime() - b.createdAt.getTime();
    });

    for (let i = 0; i < ordenada.length; i++) {
      const atual = ordenada[i];
      const proxima = ordenada[i + 1] ?? null;
      const diaAtual = atual.data.getTime();
      const diaProxima = proxima ? proxima.data.getTime() : null;

      let acumulado = 0;
      for (const chuva of chuvas) {
        const diaChuva = chuva.data.getTime();

        if (diaChuva === diaAtual) {
          if (chuva.relacaoTratamentoDia !== "DEPOIS") continue;
        } else if (diaChuva < diaAtual) {
          continue;
        } else if (diaProxima !== null && diaChuva > diaProxima) {
          continue;
        } else if (diaProxima !== null && diaChuva === diaProxima) {
          if (chuva.relacaoTratamentoDia === "DEPOIS") continue;
        }

        acumulado += Number(chuva.quantidadeMm);
      }

      resultado.set(atual.id, acumulado);
    }
  }

  return resultado;
}
```

- [ ] **Step 2: Sanity-check the calculation with throwaway data**

Create a temporary file `/tmp/verificar-chuva.ts`:

```ts
import { calcularAcumuladoPorTratamento } from "./src/lib/chuva";

const T1 = { id: "T1", talhaoId: "A", data: new Date("2026-06-01"), createdAt: new Date("2026-06-01") };
const T2 = { id: "T2", talhaoId: "A", data: new Date("2026-06-10"), createdAt: new Date("2026-06-10") };

const resultado = calcularAcumuladoPorTratamento(
  [T1, T2],
  [
    { data: new Date("2026-06-03"), quantidadeMm: 10, relacaoTratamentoDia: null }, // conta em T1
    { data: new Date("2026-06-10"), quantidadeMm: 5, relacaoTratamentoDia: "ANTES" }, // conta em T1 (fecha)
    { data: new Date("2026-06-10"), quantidadeMm: 7, relacaoTratamentoDia: "DEPOIS" }, // conta em T2 (abre)
    { data: new Date("2026-06-15"), quantidadeMm: 3, relacaoTratamentoDia: null }, // conta em T2 (aberto)
  ],
);

console.log("T1 (esperado 15):", resultado.get("T1"));
console.log("T2 (esperado 10):", resultado.get("T2"));
if (resultado.get("T1") !== 15 || resultado.get("T2") !== 10) {
  throw new Error("Cálculo incorreto");
}
console.log("OK");
```

Run: `npx tsx /tmp/verificar-chuva.ts` (run from the project root so the relative import
resolves)
Expected: `T1 (esperado 15): 15`, `T2 (esperado 10): 10`, `OK`.

- [ ] **Step 3: Delete the throwaway script**

Run: `rm /tmp/verificar-chuva.ts`

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this file.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chuva.ts
git commit -m "Adiciona queries e cálculo de acumulado de chuva por tratamento"
```

---

### Task 5: `src/actions/chuva.ts` — Server Actions

**Files:**
- Create: `src/actions/chuva.ts`

**Interfaces:**
- Consumes: `exigirPropriedadeAtual`, `garantirChuvaDaPropriedade` from `@/lib/propriedade`
  (Task 3).
- Produces:
  - `criarChuvaRegistro(_prevState, formData): Promise<string | undefined>`
  - `atualizarChuvaRegistro(chuvaId: string, _prevState, formData): Promise<string | undefined>`
  - `excluirChuvaRegistro(chuvaId: string): Promise<void>`

- [ ] **Step 1: Write `src/actions/chuva.ts`**

```ts
"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual, garantirChuvaDaPropriedade } from "@/lib/propriedade";

function lerFormularioChuva(formData: FormData) {
  const relacaoRaw = String(formData.get("relacaoTratamentoDia") ?? "");
  return {
    dataStr: String(formData.get("data") ?? ""),
    quantidadeMm: Number(formData.get("quantidadeMm")),
    relacaoTratamentoDia: relacaoRaw === "ANTES" || relacaoRaw === "DEPOIS" ? relacaoRaw : null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

function validarChuva(dados: ReturnType<typeof lerFormularioChuva>): string | undefined {
  if (!dados.dataStr) return "Informe a data da leitura.";
  if (!dados.quantidadeMm || dados.quantidadeMm <= 0) return "Informe uma quantidade em mm maior que zero.";
  return undefined;
}

export async function criarChuvaRegistro(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioChuva(formData);
  const erro = validarChuva(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  await db.chuvaRegistro.create({
    data: {
      propriedadeId,
      data: new Date(dados.dataStr),
      quantidadeMm: dados.quantidadeMm,
      relacaoTratamentoDia: dados.relacaoTratamentoDia,
      observacoes: dados.observacoes,
    },
  });

  revalidatePath("/chuva");
  revalidatePath("/tratamentos");
  redirect("/chuva");
}

export async function atualizarChuvaRegistro(
  chuvaId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioChuva(formData);
  const erro = validarChuva(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirChuvaDaPropriedade(chuvaId, propriedadeId))) {
    return "Leitura inválida para a propriedade atual.";
  }

  await db.chuvaRegistro.update({
    where: { id: chuvaId },
    data: {
      data: new Date(dados.dataStr),
      quantidadeMm: dados.quantidadeMm,
      relacaoTratamentoDia: dados.relacaoTratamentoDia,
      observacoes: dados.observacoes,
    },
  });

  revalidatePath("/chuva");
  revalidatePath("/tratamentos");
  redirect("/chuva");
}

export async function excluirChuvaRegistro(chuvaId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirChuvaDaPropriedade(chuvaId, propriedadeId))) return;

  await db.chuvaRegistro.delete({ where: { id: chuvaId } });
  revalidatePath("/chuva");
  revalidatePath("/tratamentos");
  redirect("/chuva");
}
```

Note: no blocking-on-related-records check before delete — a `ChuvaRegistro` has no
downstream record pointing at it (the accumulated total is computed live, never stored), so
deletion is always safe, consistent with the "só bloqueia por vínculo real" rule.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/actions/chuva.ts
git commit -m "Adiciona Server Actions de criação, edição e exclusão de leituras de chuva"
```

---

### Task 6: `src/components/chuva/chuva-form.tsx` — form component

**Files:**
- Create: `src/components/chuva/chuva-form.tsx`

**Interfaces:**
- Consumes: `useFormularioAcao` from `@/hooks/use-formulario-acao` (existing).
- Produces: `<ChuvaForm action defaultValues? submitLabel? datasComTratamento />`, consumed by
  Task 7's pages.

- [ ] **Step 1: Write `src/components/chuva/chuva-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type ChuvaFormValues = {
  data: string;
  quantidadeMm: string;
  relacaoTratamentoDia: string;
  observacoes: string;
};

type ChuvaAction = (
  prevState: string | undefined,
  formData: FormData,
) => Promise<string | undefined>;

export function ChuvaForm({
  action,
  defaultValues,
  submitLabel = "Registrar leitura",
  datasComTratamento,
}: {
  action: ChuvaAction;
  defaultValues?: Partial<ChuvaFormValues>;
  submitLabel?: string;
  /** Datas (YYYY-MM-DD) em que já existe algum tratamento fitossanitário registrado. */
  datasComTratamento: string[];
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);
  const [data, setData] = useState(defaultValues?.data ?? new Date().toISOString().slice(0, 10));

  const coincideComTratamento = datasComTratamento.includes(data);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
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
        <div>
          <label htmlFor="quantidadeMm" className="mb-1 block text-sm font-medium text-neutral-700">
            Quantidade (mm) *
          </label>
          <input
            id="quantidadeMm"
            name="quantidadeMm"
            type="number"
            inputMode="decimal"
            min="0.1"
            step="0.1"
            required
            defaultValue={defaultValues?.quantidadeMm}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      </div>

      {coincideComTratamento && (
        <div>
          <label htmlFor="relacaoTratamentoDia" className="mb-1 block text-sm font-medium text-neutral-700">
            Essa chuva caiu antes ou depois da aplicação desse dia?
          </label>
          <select
            id="relacaoTratamentoDia"
            name="relacaoTratamentoDia"
            defaultValue={defaultValues?.relacaoTratamentoDia ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            <option value="">Não sei / não importa</option>
            <option value="ANTES">Antes da aplicação</option>
            <option value="DEPOIS">Depois da aplicação</option>
          </select>
          <p className="mt-1 text-xs text-neutral-500">
            Há um tratamento fitossanitário registrado nessa data — isso define se a chuva
            conta para o tratamento que estava em andamento ou para esse novo.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="observacoes" className="mb-1 block text-sm font-medium text-neutral-700">
          Observações
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          defaultValue={defaultValues?.observacoes}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      {erro}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-green-700 py-3 text-base font-medium text-white active:bg-green-800 disabled:opacity-60"
      >
        {rotulo(submitLabel)}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/chuva/chuva-form.tsx
git commit -m "Adiciona formulário de leitura de chuva"
```

---

### Task 7: `/chuva` pages — list, create, edit

**Files:**
- Create: `src/app/(app)/chuva/page.tsx`
- Create: `src/app/(app)/chuva/nova/page.tsx`
- Create: `src/app/(app)/chuva/[id]/editar/page.tsx`

**Interfaces:**
- Consumes: `buscarChuvaRegistros`, `buscarDatasComTratamentoFitossanitario` (Task 4);
  `criarChuvaRegistro`, `atualizarChuvaRegistro`, `excluirChuvaRegistro` (Task 5); `ChuvaForm`
  (Task 6); `exigirPropriedadeAtual` (existing); `ConfirmarExclusao`
  (`@/components/ui/confirmar-exclusao`, existing); `VoltarLink` (`@/components/nav/voltar-link`,
  existing); `formatarData` (`@/lib/format`, existing).

- [ ] **Step 1: Write the list page `src/app/(app)/chuva/page.tsx`**

```tsx
import Link from "next/link";
import { formatarData } from "@/lib/format";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { buscarChuvaRegistros } from "@/lib/chuva";

export default async function ChuvaPage() {
  const propriedadeId = await exigirPropriedadeAtual();
  const leituras = await buscarChuvaRegistros(propriedadeId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Controle de Chuva</h1>
        <Link
          href="/chuva/nova"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova leitura
        </Link>
      </div>

      {leituras.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma leitura registrada ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {leituras.map((leitura) => (
            <Link
              key={leitura.id}
              href={`/chuva/${leitura.id}/editar`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {formatarData(leitura.data)} · {Number(leitura.quantidadeMm).toLocaleString("pt-BR")} mm
                </p>
                {leitura.observacoes && <p className="text-xs text-neutral-500">{leitura.observacoes}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write the create page `src/app/(app)/chuva/nova/page.tsx`**

```tsx
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { buscarDatasComTratamentoFitossanitario } from "@/lib/chuva";
import { criarChuvaRegistro } from "@/actions/chuva";
import { ChuvaForm } from "@/components/chuva/chuva-form";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaChuvaPage() {
  const propriedadeId = await exigirPropriedadeAtual();
  const datasComTratamento = await buscarDatasComTratamentoFitossanitario(propriedadeId);

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/chuva" label="Voltar ao Controle de Chuva" />
      <h1 className="text-xl font-semibold text-neutral-900">Nova leitura de chuva</h1>
      <ChuvaForm action={criarChuvaRegistro} datasComTratamento={datasComTratamento} />
    </div>
  );
}
```

- [ ] **Step 3: Write the edit page `src/app/(app)/chuva/[id]/editar/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { buscarDatasComTratamentoFitossanitario } from "@/lib/chuva";
import { atualizarChuvaRegistro, excluirChuvaRegistro } from "@/actions/chuva";
import { ChuvaForm } from "@/components/chuva/chuva-form";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarChuvaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const [leitura, datasComTratamento] = await Promise.all([
    db.chuvaRegistro.findUnique({ where: { id } }),
    buscarDatasComTratamentoFitossanitario(propriedadeId),
  ]);

  if (!leitura || leitura.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/chuva" label="Voltar ao Controle de Chuva" />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Editar leitura</h1>
        <ConfirmarExclusao action={excluirChuvaRegistro.bind(null, leitura.id)} />
      </div>
      <ChuvaForm
        action={atualizarChuvaRegistro.bind(null, leitura.id)}
        submitLabel="Salvar alterações"
        datasComTratamento={datasComTratamento}
        defaultValues={{
          data: leitura.data.toISOString().slice(0, 10),
          quantidadeMm: leitura.quantidadeMm.toString(),
          relacaoTratamentoDia: leitura.relacaoTratamentoDia ?? "",
          observacoes: leitura.observacoes ?? "",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from these three files.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/chuva"
git commit -m "Adiciona telas do Controle de Chuva (lista, cadastro e edição de leituras)"
```

---

### Task 8: Navigation entry

**Files:**
- Modify: `src/lib/nav-items.ts`

**Interfaces:**
- Produces: a `/chuva` entry in `SECONDARY_NAV_ITEMS`, consumed by
  `src/app/(app)/mais/page.tsx` and `src/components/nav/side-nav.tsx` (existing, unchanged).

- [ ] **Step 1: Add the `CloudRain` icon import and the nav entry**

Replace the import block:

```ts
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
  Droplet,
} from "lucide-react";
```

with:

```ts
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
  Droplet,
  CloudRain,
} from "lucide-react";
```

Replace `SECONDARY_NAV_ITEMS`:

```ts
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { href: "/historico-pomar", label: "Histórico do Pomar", icon: History },
  { href: "/contagem-frutos", label: "Contagem de Frutos", icon: Apple },
  { href: "/diesel", label: "Controle de Diesel", icon: Droplet },
  { href: "/relatorios/horas-maquina", label: "Horas de Máquina", icon: Fuel },
  { href: "/relatorios/horas-homem", label: "Hora-Homem", icon: HardHat },
  { href: "/operadores", label: "Operadores", icon: Users },
  { href: "/usuarios", label: "Usuários", icon: User },
];
```

with:

```ts
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { href: "/historico-pomar", label: "Histórico do Pomar", icon: History },
  { href: "/contagem-frutos", label: "Contagem de Frutos", icon: Apple },
  { href: "/diesel", label: "Controle de Diesel", icon: Droplet },
  { href: "/chuva", label: "Controle de Chuva", icon: CloudRain },
  { href: "/relatorios/horas-maquina", label: "Horas de Máquina", icon: Fuel },
  { href: "/relatorios/horas-homem", label: "Hora-Homem", icon: HardHat },
  { href: "/operadores", label: "Operadores", icon: Users },
  { href: "/usuarios", label: "Usuários", icon: User },
];
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/nav-items.ts
git commit -m "Adiciona Controle de Chuva ao menu"
```

---

### Task 9: Tratamentos Fitossanitários — accumulated rain badge

**Files:**
- Modify: `src/app/(app)/tratamentos/page.tsx`

**Interfaces:**
- Consumes: `buscarChuvaRegistros` (Task 4), `calcularAcumuladoPorTratamento` (Task 4).

- [ ] **Step 1: Fetch chuva data and compute accumulated totals**

In `src/app/(app)/tratamentos/page.tsx`, add the import (alongside the existing ones):

```ts
import { buscarChuvaRegistros, calcularAcumuladoPorTratamento } from "@/lib/chuva";
```

Replace the operações fetch block:

```tsx
  const operacoes = await db.operacaoAgricola.findMany({
    where: talhaoSelecionado ? { talhaoId: talhaoSelecionado } : { talhao: { propriedadeId } },
    orderBy: [{ data: "desc" }, { createdAt: "asc" }],
    include: {
      talhao: true,
      produtos: { include: { produto: true } },
    },
  });
```

with:

```tsx
  const operacoes = await db.operacaoAgricola.findMany({
    where: talhaoSelecionado ? { talhaoId: talhaoSelecionado } : { talhao: { propriedadeId } },
    orderBy: [{ data: "desc" }, { createdAt: "asc" }],
    include: {
      talhao: true,
      produtos: { include: { produto: true } },
    },
  });

  const chuvas = await buscarChuvaRegistros(propriedadeId);
  const fitossanitarios = operacoes
    .filter((o) => o.tipo === "FITOSSANITARIO")
    .map((o) => ({ id: o.id, talhaoId: o.talhaoId, data: o.data, createdAt: o.createdAt }));
  const acumulados = calcularAcumuladoPorTratamento(
    fitossanitarios,
    chuvas.map((c) => ({ data: c.data, quantidadeMm: c.quantidadeMm, relacaoTratamentoDia: c.relacaoTratamentoDia })),
  );
```

- [ ] **Step 2: Render the badge above each fitossanitário card**

Replace:

```tsx
              {itensDoDia.map((operacao, indice) => (
                <div key={operacao.id} className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
                  <Link
```

with:

```tsx
              {itensDoDia.map((operacao, indice) => {
                const acumulado = acumulados.get(operacao.id) ?? 0;
                return (
                <div key={operacao.id} className="flex flex-col gap-1">
                  {operacao.tipo === "FITOSSANITARIO" && acumulado > 0 && (
                    <p className="px-1 text-xs text-neutral-400">
                      🌧 {acumulado.toLocaleString("pt-BR")}mm acumulados desde a aplicação
                    </p>
                  )}
                  <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
                  <Link
```

Then, further down, close the two new wrapping elements. Replace the closing of the card
(currently the last two lines inside the `itensDoDia.map` callback):

```tsx
                  </table>
                </div>
              ))}
```

with:

```tsx
                  </table>
                  </div>
                </div>
                );
              })}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 4: Build**

Run: `npx next build --webpack`
Expected: build succeeds, `/tratamentos` listed in the route output.

- [ ] **Step 5: Manual verification**

Start the dev server (`npm run dev`, or use whichever port is already free — do not restart a
server that might be in real use), open `/tratamentos`, and confirm: (a) treatments without
rain after them show no badge, (b) a treatment with rain registered after it (add a test
`ChuvaRegistro` via `/chuva/nova` with a date after an existing treatment, then delete it once
confirmed) shows the "🌧 Nmm acumulados" line above its card.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/tratamentos/page.tsx"
git commit -m "Exibe chuva acumulada acima de cada tratamento fitossanitário"
```

---

### Task 10: Atividade — talhão opcional para "Chuva" (formulário e ações)

**Files:**
- Modify: `src/components/atividades/atividade-form.tsx`
- Modify: `src/actions/atividades.ts`

**Interfaces:**
- Consumes: `garantirAtividadeDaPropriedade` (Task 3, already fixed).
- Produces: `AtividadeForm` now accepts talhão-less submission when the selected tipo is
  "Chuva"; `criarAtividade`/`atualizarAtividade` enforce that rule server-side (not just via
  the UI).

- [ ] **Step 1: Make the talhão field conditional in `AtividadeForm`**

Change the `tiposAtividade` prop type and read the selected tipo's name. Replace:

```tsx
type Opcao = { id: string; nome: string };
```

with (unchanged — already has `nome`; no type change needed here). Add a new piece of state
right after the existing `useState` calls:

```tsx
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);
  const [numeroPessoas, setNumeroPessoas] = useState(defaultValues?.numeroPessoas ?? "");
  const [horasPorPessoa, setHorasPorPessoa] = useState(defaultValues?.horasPorPessoa ?? "");
  const [tipoAtividadeId, setTipoAtividadeId] = useState(defaultValues?.tipoAtividadeId ?? "");

  const tipoSelecionado = tiposAtividade.find((t) => t.id === tipoAtividadeId);
  const talhaoObrigatorio = tipoSelecionado?.nome !== "Chuva";
```

Replace the `tipoAtividadeId` select's `defaultValue`/uncontrolled setup:

```tsx
          <select
            id="tipoAtividadeId"
            name="tipoAtividadeId"
            required
            defaultValue={defaultValues?.tipoAtividadeId ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
```

with:

```tsx
          <select
            id="tipoAtividadeId"
            name="tipoAtividadeId"
            required
            value={tipoAtividadeId}
            onChange={(e) => setTipoAtividadeId(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
```

Replace the talhão field block:

```tsx
      <div>
        <label htmlFor="talhaoId" className="mb-1 block text-sm font-medium text-neutral-700">
          Talhão *
        </label>
        <select
          id="talhaoId"
          name="talhaoId"
          required
          defaultValue={defaultValues?.talhaoId ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {talhoes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>
```

with:

```tsx
      <div>
        <label htmlFor="talhaoId" className="mb-1 block text-sm font-medium text-neutral-700">
          Talhão{talhaoObrigatorio ? " *" : ""}
        </label>
        <select
          id="talhaoId"
          name="talhaoId"
          required={talhaoObrigatorio}
          defaultValue={defaultValues?.talhaoId ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="">{talhaoObrigatorio ? "Selecione..." : "Nenhum (atividade geral)"}</option>
          {talhoes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        {!talhaoObrigatorio && (
          <p className="mt-1 text-xs text-neutral-500">
            "Chuva" é uma parada geral da equipe — não precisa de um talhão específico.
          </p>
        )}
      </div>
```

Also update the `AtividadeFormValues` type's `talhaoId` — no change needed, it's already
`string` (empty string represents "none").

- [ ] **Step 2: Rewrite `src/actions/atividades.ts`**

Replace the entire file with:

```ts
"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual, garantirAtividadeDaPropriedade } from "@/lib/propriedade";

function lerFormularioAtividade(formData: FormData) {
  const horasMaquinaRaw = formData.get("horasMaquina");
  const talhaoIdRaw = String(formData.get("talhaoId") ?? "").trim();

  return {
    tipoAtividadeId: String(formData.get("tipoAtividadeId") ?? ""),
    talhaoId: talhaoIdRaw || null,
    dataStr: String(formData.get("data") ?? ""),
    numeroPessoas: Number(formData.get("numeroPessoas") ?? 0),
    horasPorPessoa: Number(formData.get("horasPorPessoa") ?? 0),
    horasMaquina: horasMaquinaRaw ? Number(horasMaquinaRaw) : null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

async function validarAtividade(dados: ReturnType<typeof lerFormularioAtividade>): Promise<string | undefined> {
  if (!dados.tipoAtividadeId || !dados.dataStr) {
    return "Preencha o tipo de atividade e a data.";
  }
  if (!dados.numeroPessoas || dados.numeroPessoas < 1 || !dados.horasPorPessoa || dados.horasPorPessoa <= 0) {
    return "Informe a quantidade de pessoas e as horas por pessoa, maior que zero.";
  }
  if (dados.horasMaquina !== null && !Number.isFinite(dados.horasMaquina)) {
    return "Horas de máquina deve conter apenas números.";
  }

  const tipo = await db.tipoAtividade.findUnique({ where: { id: dados.tipoAtividadeId }, select: { nome: true } });
  if (!tipo) return "Tipo de atividade inválido.";
  if (tipo.nome !== "Chuva" && !dados.talhaoId) {
    return "Preencha o talhão.";
  }
  return undefined;
}

export async function criarAtividade(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioAtividade(formData);
  const erro = await validarAtividade(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  if (dados.talhaoId) {
    const talhao = await db.talhao.findUnique({ where: { id: dados.talhaoId }, select: { propriedadeId: true } });
    if (!talhao || talhao.propriedadeId !== propriedadeId) {
      return "Talhão inválido para a propriedade atual.";
    }
  }

  const atividade = await db.atividade.create({
    data: {
      tipoAtividadeId: dados.tipoAtividadeId,
      propriedadeId,
      talhaoId: dados.talhaoId,
      data: new Date(dados.dataStr),
      numeroPessoas: dados.numeroPessoas,
      horasPorPessoa: dados.horasPorPessoa,
      horasMaquina: dados.horasMaquina,
      observacoes: dados.observacoes,
    },
  });

  revalidatePath("/atividades");
  if (dados.talhaoId) revalidatePath(`/talhoes/${dados.talhaoId}`);
  redirect(`/atividades/${atividade.id}`);
}

export async function atualizarAtividade(
  atividadeId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioAtividade(formData);
  const erro = await validarAtividade(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirAtividadeDaPropriedade(atividadeId, propriedadeId))) {
    return "Atividade inválida para a propriedade atual.";
  }

  if (dados.talhaoId) {
    const talhao = await db.talhao.findUnique({ where: { id: dados.talhaoId }, select: { propriedadeId: true } });
    if (!talhao || talhao.propriedadeId !== propriedadeId) {
      return "Talhão inválido para a propriedade atual.";
    }
  }

  await db.atividade.update({
    where: { id: atividadeId },
    data: {
      tipoAtividadeId: dados.tipoAtividadeId,
      talhaoId: dados.talhaoId,
      data: new Date(dados.dataStr),
      numeroPessoas: dados.numeroPessoas,
      horasPorPessoa: dados.horasPorPessoa,
      horasMaquina: dados.horasMaquina,
      observacoes: dados.observacoes,
    },
  });

  revalidatePath("/atividades");
  revalidatePath(`/atividades/${atividadeId}`);
  if (dados.talhaoId) revalidatePath(`/talhoes/${dados.talhaoId}`);
  redirect(`/atividades/${atividadeId}`);
}

export async function excluirAtividade(atividadeId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  const atividade = await db.atividade.findUnique({
    where: { id: atividadeId },
    select: { talhaoId: true, propriedadeId: true },
  });
  if (!atividade || atividade.propriedadeId !== propriedadeId) return;

  await db.atividade.delete({ where: { id: atividadeId } });
  revalidatePath("/atividades");
  if (atividade.talhaoId) revalidatePath(`/talhoes/${atividade.talhaoId}`);
  redirect("/atividades");
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors remaining only in `src/app/(app)/atividades/page.tsx`,
`src/app/(app)/atividades/[id]/page.tsx`, `src/app/(app)/atividades/[id]/editar/page.tsx`,
`src/lib/relatorios.ts`, `src/app/api/export/atividades/route.ts` — fixed in Task 11.

- [ ] **Step 4: Commit**

```bash
git add src/components/atividades/atividade-form.tsx src/actions/atividades.ts
git commit -m "Torna talhão opcional no formulário e nas ações de Atividade (tipo Chuva)"
```

---

### Task 11: Atividade — talhão opcional nas telas e relatórios

**Files:**
- Modify: `src/app/(app)/atividades/page.tsx`
- Modify: `src/app/(app)/atividades/[id]/page.tsx`
- Modify: `src/app/(app)/atividades/[id]/editar/page.tsx`
- Modify: `src/lib/relatorios.ts`
- Modify: `src/app/api/export/atividades/route.ts`

**Interfaces:**
- Consumes: nothing new — this task only removes the assumption that `Atividade.talhao` is
  always present.

- [ ] **Step 1: `src/app/(app)/atividades/page.tsx`**

Replace:

```tsx
  const atividades = await db.atividade.findMany({
    where: { talhao: { propriedadeId } },
    orderBy: { data: "desc" },
    include: { tipoAtividade: true, talhao: true },
  });
```

with:

```tsx
  const atividades = await db.atividade.findMany({
    where: { propriedadeId },
    orderBy: { data: "desc" },
    include: { tipoAtividade: true, talhao: true },
  });
```

Replace:

```tsx
                  <p className="text-sm font-medium text-neutral-900">
                    {atividade.tipoAtividade.nome} · {atividade.talhao.nomeCodinome}
                  </p>
```

with:

```tsx
                  <p className="text-sm font-medium text-neutral-900">
                    {atividade.tipoAtividade.nome}
                    {atividade.talhao ? ` · ${atividade.talhao.nomeCodinome}` : ""}
                  </p>
```

- [ ] **Step 2: `src/app/(app)/atividades/[id]/page.tsx`**

Replace:

```tsx
  if (!atividade || atividade.talhao.propriedadeId !== propriedadeId) notFound();
```

with:

```tsx
  if (!atividade || atividade.propriedadeId !== propriedadeId) notFound();
```

The `atividade` query itself (`db.atividade.findUnique({ where: { id }, include: { tipoAtividade: true, talhao: true } })`)
does not need to change — `propriedadeId` is a plain scalar field on `Atividade`, already
returned by default without needing to be added to `include`/`select`.

Replace:

```tsx
        <div className="flex items-center gap-3">
          <Link href={`/talhoes/${atividade.talhaoId}`} className="text-sm font-medium text-green-700">
            Ver talhão
          </Link>
          <Link
```

with:

```tsx
        <div className="flex items-center gap-3">
          {atividade.talhaoId && (
            <Link href={`/talhoes/${atividade.talhaoId}`} className="text-sm font-medium text-green-700">
              Ver talhão
            </Link>
          )}
          <Link
```

Replace:

```tsx
        <Linha label="Talhão" valor={atividade.talhao.nomeCodinome} />
```

with:

```tsx
        <Linha label="Talhão" valor={atividade.talhao?.nomeCodinome ?? "— (atividade geral)"} />
```

- [ ] **Step 3: `src/app/(app)/atividades/[id]/editar/page.tsx`**

Replace:

```tsx
  const atividade = await db.atividade.findUnique({
    where: { id },
    include: { talhao: true },
  });
  if (!atividade || atividade.talhao.propriedadeId !== propriedadeId) notFound();
```

with:

```tsx
  const atividade = await db.atividade.findUnique({ where: { id } });
  if (!atividade || atividade.propriedadeId !== propriedadeId) notFound();
```

Replace:

```tsx
          talhaoId: atividade.talhaoId,
```

with (unchanged — `atividade.talhaoId` is now `string | null`, and `AtividadeFormValues.talhaoId`
is `string`; pass `?? ""`):

```tsx
          talhaoId: atividade.talhaoId ?? "",
```

- [ ] **Step 4: `src/lib/relatorios.ts`**

Replace the `db.atividade.findMany` call inside `buscarHorasMaquina`:

```ts
    db.atividade.findMany({
      where: {
        horasMaquina: { gt: 0 },
        talhao,
        ...(data ? { data } : {}),
        ...(filtros.tipoAtividadeId ? { tipoAtividadeId: filtros.tipoAtividadeId } : {}),
      },
      include: { talhao: true, tipoAtividade: true },
      orderBy: { data: "desc" },
    }),
```

with:

```ts
    db.atividade.findMany({
      where: {
        horasMaquina: { gt: 0 },
        propriedadeId,
        ...(filtros.talhaoId ? { talhaoId: filtros.talhaoId } : {}),
        ...(filtros.cultura ? { talhao: { especie: filtros.cultura } } : {}),
        ...(data ? { data } : {}),
        ...(filtros.tipoAtividadeId ? { tipoAtividadeId: filtros.tipoAtividadeId } : {}),
      },
      include: { talhao: true, tipoAtividade: true },
      orderBy: { data: "desc" },
    }),
```

Replace the `atividades.map` inside `buscarHorasMaquina`:

```ts
    ...atividades.map((a) => ({
      id: a.id,
      data: a.data,
      origem: "Atividade" as const,
      descricao: a.tipoAtividade.nome,
      talhao: a.talhao.nomeCodinome,
      horas: Number(a.horasMaquina),
    })),
```

with:

```ts
    ...atividades.map((a) => ({
      id: a.id,
      data: a.data,
      origem: "Atividade" as const,
      descricao: a.tipoAtividade.nome,
      talhao: a.talhao?.nomeCodinome ?? "—",
      horas: Number(a.horasMaquina),
    })),
```

Apply the same two changes inside `buscarHorasHomem`. Replace:

```ts
    db.atividade.findMany({
      where: {
        talhao,
        ...(data ? { data } : {}),
        ...(filtros.tipoAtividadeId ? { tipoAtividadeId: filtros.tipoAtividadeId } : {}),
      },
      include: { talhao: true, tipoAtividade: true },
      orderBy: { data: "desc" },
    }),
```

with:

```ts
    db.atividade.findMany({
      where: {
        propriedadeId,
        ...(filtros.talhaoId ? { talhaoId: filtros.talhaoId } : {}),
        ...(filtros.cultura ? { talhao: { especie: filtros.cultura } } : {}),
        ...(data ? { data } : {}),
        ...(filtros.tipoAtividadeId ? { tipoAtividadeId: filtros.tipoAtividadeId } : {}),
      },
      include: { talhao: true, tipoAtividade: true },
      orderBy: { data: "desc" },
    }),
```

Replace:

```ts
    ...atividades.map((a) => ({
      id: a.id,
      data: a.data,
      origem: "Atividade" as const,
      descricao: a.tipoAtividade.nome,
      talhao: a.talhao.nomeCodinome,
      numeroPessoas: a.numeroPessoas,
      horasPorPessoa: Number(a.horasPorPessoa),
      horas: a.numeroPessoas * Number(a.horasPorPessoa),
    })),
```

with:

```ts
    ...atividades.map((a) => ({
      id: a.id,
      data: a.data,
      origem: "Atividade" as const,
      descricao: a.tipoAtividade.nome,
      talhao: a.talhao?.nomeCodinome ?? "—",
      numeroPessoas: a.numeroPessoas,
      horasPorPessoa: Number(a.horasPorPessoa),
      horas: a.numeroPessoas * Number(a.horasPorPessoa),
    })),
```

Note: `filtroTalhao` (used only for `operacaoAgricola` queries now) stays unchanged — it's
still correct there, since `OperacaoAgricola.talhaoId` remains required.

- [ ] **Step 5: `src/app/api/export/atividades/route.ts`**

Replace:

```ts
  const atividades = await db.atividade.findMany({
    where: { talhao: { propriedadeId } },
    orderBy: { data: "desc" },
    include: { tipoAtividade: true, talhao: true },
  });

  const linhas = atividades.map((atividade) => ({
    data: formatarData(atividade.data),
    tipo: atividade.tipoAtividade.nome,
    talhao: atividade.talhao.nomeCodinome,
    pessoas: atividade.numeroPessoas,
    horasPorPessoa: Number(atividade.horasPorPessoa),
    horasHomem: atividade.numeroPessoas * Number(atividade.horasPorPessoa),
    observacoes: atividade.observacoes,
  }));
```

with:

```ts
  const atividades = await db.atividade.findMany({
    where: { propriedadeId },
    orderBy: { data: "desc" },
    include: { tipoAtividade: true, talhao: true },
  });

  const linhas = atividades.map((atividade) => ({
    data: formatarData(atividade.data),
    tipo: atividade.tipoAtividade.nome,
    talhao: atividade.talhao?.nomeCodinome ?? "—",
    pessoas: atividade.numeroPessoas,
    horasPorPessoa: Number(atividade.horasPorPessoa),
    horasHomem: atividade.numeroPessoas * Number(atividade.horasPorPessoa),
    observacoes: atividade.observacoes,
  }));
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the project.

- [ ] **Step 7: Build**

Run: `npx next build --webpack`
Expected: build succeeds, `/atividades`, `/chuva`, `/chuva/nova`, `/chuva/[id]/editar` all
listed in the route output.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/atividades" src/lib/relatorios.ts "src/app/api/export/atividades/route.ts"
git commit -m "Ajusta telas e relatórios de Atividade para talhão opcional"
```

---

### Task 12: End-to-end manual verification

**Files:** none (verification only).

- [ ] **Step 1: Register a rain reading**

Open `/chuva/nova`, register a reading with today's date and a few mm. Confirm it appears in
`/chuva`.

- [ ] **Step 2: Edit and delete a rain reading**

From `/chuva`, click the reading, change the mm value, save, confirm the list reflects the
change. Then delete it via the two-step confirm button and confirm it disappears from the list.

- [ ] **Step 3: Verify the accumulated badge on a real (or temporary test) talhão**

Register two rain readings on dates between two existing fitossanitário treatments on the same
talhão (or create two test treatments if none exist), reload `/tratamentos`, and confirm the
older treatment shows the correct accumulated mm and the newest one shows nothing (if no rain
after it yet) or a live-growing total (if there is). Delete any test data created for this
check afterward — re-check counts before deleting to avoid removing anything the farm may have
entered in parallel.

- [ ] **Step 4: Register a "Chuva" activity in Horas-Homem**

Open `/atividades/nova`, select "Chuva" as the tipo, confirm the Talhão field is no longer
required (shows "Nenhum (atividade geral)"), fill in people/hours, submit. Confirm it appears
in `/atividades` and in `/relatorios/horas-homem`'s total and line list, with the talhão column
showing "—".

- [ ] **Step 5: Confirm existing (non-Chuva) activities still require a talhão**

Open `/atividades/nova`, select any other tipo (e.g. "Podar"), leave Talhão empty, submit.
Expected: the browser blocks submission (native `required` validation) since `talhaoObrigatorio`
is `true` for that tipo.

## Self-Review Notes

- **Spec coverage:** §1 (schema) → Task 1–2. §2 (aba Controle de Chuva) → Tasks 4–7. §3
  (integração com Tratamentos) → Tasks 4, 9. §4 (Horas-Homem "Chuva") → Tasks 3, 10, 11. All
  four spec sections have at least one task.
- **Placeholder scan:** none found — every step has complete code or an exact command with
  expected output.
- **Type consistency:** `calcularAcumuladoPorTratamento` (Task 4) is used with the exact same
  parameter shape in Task 9. `garantirChuvaDaPropriedade`/`garantirAtividadeDaPropriedade`
  (Task 3) signatures match their call sites in Tasks 5 and 10. `ChuvaForm`'s
  `datasComTratamento` prop is threaded through both Task 7 pages that render it.
