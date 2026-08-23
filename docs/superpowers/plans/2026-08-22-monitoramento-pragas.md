# Monitoramento de Pragas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the pheromone-trap pest monitoring workflow (Grapholita molesta, Moscas-das-frutas, Bonagota, Cydia) that today lives in `Monitoramento_2026-2027.xlsx` into the POMO SUL system: register traps per talhão, log counts twice a week, auto-calculate the "nível de controle" using the same formulas the spreadsheet already uses, and surface a visual signal when a point crosses the threshold.

**Architecture:** Next.js App Router + Server Actions + Prisma/PostgreSQL, following the codebase's existing module pattern (see `contagem-frutos` and `operacoes` as the closest analogs). A new `PontoMonitoramento → Armadilha → LeituraArmadilha` hierarchy mirrors the spreadsheet's "grupo de armadilhas com Média" structure. All threshold math lives in one pure, dependency-free module (`src/lib/pragas.ts`).

**Tech Stack:** Next.js 16 (App Router, Server Actions), Prisma 7 + `@prisma/adapter-pg`, PostgreSQL, Tailwind. Adds **Vitest** as a new devDependency, scoped only to `src/lib/pragas.ts` — see Global Constraints.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-22-monitoramento-pragas-design.md` — every task below implements a section of it.
- Talhão is the center of the system: every `Armadilha` links to a `Talhao`.
- Multi-tenant guard: every action that receives an id from a form/URL must confirm it belongs to the propriedade currently selected (cookie), via a `garantirXDaPropriedade` helper in `src/lib/propriedade.ts` — see existing helpers in that file for the pattern.
- Migrations are always hand-written, additive SQL files under `prisma/migrations/<timestamp>_<name>/migration.sql` — never a generated destructive migration. Timestamp format `YYYYMMDDHHMMSS`, must sort after `20260715120000_meta_safra`.
- Delete semantics: only block/soft-delete a record when it has a **real historical link that would break another record** (a leitura already logged). See `excluirProduto` in `src/actions/estoque.ts` for the exact pattern (hard-delete if no real link, else flip `ativo: false` and redirect with `?resultado=inativado`).
- Never use `window.confirm()` — every delete button uses `src/components/ui/confirmar-exclusao.tsx` (`ConfirmarExclusao`).
- Forms follow the `action` / `defaultValues` / `submitLabel` reusable-component pattern (see `ContagemForm`), paired with the `useFormularioAcao` hook for pending/error state.
- **This codebase has zero automated tests today** — verification is done live in the browser (per the project's own convention: "Teste ao vivo no navegador, não só tsc/lint/build"). This plan keeps that convention for all UI/action code, verified via `npm run build` + manual browser check. The one exception is `src/lib/pragas.ts` (Task 2): it is pure, dependency-free, and encodes non-obvious threshold/rolling-window math ported from real spreadsheet formulas, where a regression bug would be easy to introduce silently and hard to catch by eye — that risk profile is worth introducing Vitest for, scoped to that one file only. Nothing else in this plan gets a test file.
- Dates from `<input type="date">` are stored as UTC midnight; always format with `formatarData` (`src/lib/format.ts`) or `{ timeZone: "UTC" }`.

---

## File Structure

```
prisma/schema.prisma                                          # + TipoPraga enum, 3 models (Task 1)
prisma/migrations/20260822130000_monitoramento_pragas/         # (Task 1)

src/lib/pragas.ts                                               # pure calc: médias, nível de controle (Task 2)
src/lib/pragas.test.ts                                          # Vitest (Task 2)
src/lib/propriedade.ts                                          # + 3 guard helpers (Task 1)
src/lib/nav-items.ts                                             # + nav item (Task 8)
src/lib/dashboard.ts                                             # + buscarAlertasPragas (Task 8)

src/actions/pragas.ts                                            # every server action for this feature (Tasks 3-6)

src/app/(app)/monitoramento-pragas/
  page.tsx                                                        # status por ponto (Task 7)
  nova/page.tsx                                                    # grade de lançamento (Task 5)
  leituras/[id]/editar/page.tsx                                    # editar/excluir 1 leitura (Task 6)
  pontos/page.tsx                                                  # lista de pontos (Task 3)
  pontos/novo/page.tsx                                             # (Task 3)
  pontos/[id]/page.tsx                                             # detalhe + histórico de leituras (Task 3, 6)
  pontos/[id]/editar/page.tsx                                      # (Task 3)
  armadilhas/page.tsx                                              # (Task 4)
  armadilhas/novo/page.tsx                                         # (Task 4)
  armadilhas/[id]/editar/page.tsx                                  # (Task 4)

src/components/pragas/
  ponto-form.tsx, excluir-ponto-form.tsx                           # (Task 3)
  armadilha-form.tsx, excluir-armadilha-form.tsx                   # (Task 4)
  grade-leituras-form.tsx                                          # (Task 5)
  leitura-form.tsx, excluir-leitura-form.tsx                       # (Task 6)
  status-praga-badge.tsx                                           # (Task 7)

src/app/api/export/pragas/route.ts                                # CSV export (Task 9)

scripts/importar-monitoramento-pragas.ts                          # one-off migration script (Task 10)
```

---

### Task 1: Schema, migration e guards multi-propriedade

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260822130000_monitoramento_pragas/migration.sql`
- Modify: `src/lib/propriedade.ts`

**Interfaces:**
- Produces: Prisma models `PontoMonitoramento`, `Armadilha`, `LeituraArmadilha`, enum `TipoPraga` (`GRAPHOLITA_MOLESTA | MOSCA_DAS_FRUTAS | BONAGOTA | CYDIA`). Functions `garantirPontoMonitoramentoDaPropriedade(pontoId, propriedadeId)`, `garantirArmadilhaDaPropriedade(armadilhaId, propriedadeId)`, `garantirLeituraDaPropriedade(leituraId, propriedadeId)` — all `Promise<boolean>`.

- [ ] **Step 1: Add the enum and three models to the schema**

Add near the end of `prisma/schema.prisma`, after the `VisitaCampo` model:

```prisma
// ---------------------------------------------------------------------------
// Monitoramento de Pragas — armadilhas com feromônio lidas 2x/semana,
// agrupadas em Pontos de Monitoramento (várias armadilhas próximas avaliadas
// em conjunto, como já é feito na planilha usada hoje pela propriedade)
// ---------------------------------------------------------------------------

enum TipoPraga {
  GRAPHOLITA_MOLESTA
  MOSCA_DAS_FRUTAS
  BONAGOTA
  CYDIA
}

model PontoMonitoramento {
  id            String      @id @default(cuid())
  propriedade   Propriedade @relation(fields: [propriedadeId], references: [id])
  propriedadeId String      @map("propriedade_id")
  tipoPraga     TipoPraga   @map("tipo_praga")
  nome          String
  safra         String
  ativo         Boolean     @default(true)
  createdAt     DateTime    @default(now()) @map("created_at")

  armadilhas Armadilha[]

  @@unique([propriedadeId, tipoPraga, nome, safra])
  @@index([propriedadeId, tipoPraga, safra])
  @@map("pontos_monitoramento")
}

model Armadilha {
  id                   String             @id @default(cuid())
  pontoMonitoramento   PontoMonitoramento @relation(fields: [pontoMonitoramentoId], references: [id])
  pontoMonitoramentoId String             @map("ponto_monitoramento_id")
  talhao               Talhao             @relation(fields: [talhaoId], references: [id])
  talhaoId             String             @map("talhao_id")
  rotulo               String
  ativo                Boolean            @default(true)
  createdAt            DateTime           @default(now()) @map("created_at")

  leituras LeituraArmadilha[]

  @@index([pontoMonitoramentoId])
  @@index([talhaoId])
  @@map("armadilhas")
}

model LeituraArmadilha {
  id          String    @id @default(cuid())
  armadilha   Armadilha @relation(fields: [armadilhaId], references: [id])
  armadilhaId String    @map("armadilha_id")
  data        DateTime
  quantidade  Int
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([armadilhaId, data])
  @@map("leituras_armadilha")
}
```

Then add the inverse relations to the two existing models:

In `model Propriedade`, add alongside the other array fields:
```prisma
  pontosMonitoramento PontoMonitoramento[]
```

In `model Talhao`, add alongside the other array fields:
```prisma
  armadilhas Armadilha[]
```

- [ ] **Step 2: Write the migration SQL by hand**

Create `prisma/migrations/20260822130000_monitoramento_pragas/migration.sql`:

```sql
-- Novo módulo Monitoramento de Pragas (Grapholita molesta, Moscas-das-frutas,
-- Bonagota, Cydia) — substitui a planilha Monitoramento_2026-2027.xlsx.

-- CreateEnum
CREATE TYPE "TipoPraga" AS ENUM ('GRAPHOLITA_MOLESTA', 'MOSCA_DAS_FRUTAS', 'BONAGOTA', 'CYDIA');

-- CreateTable
CREATE TABLE "pontos_monitoramento" (
    "id" TEXT NOT NULL,
    "propriedade_id" TEXT NOT NULL,
    "tipo_praga" "TipoPraga" NOT NULL,
    "nome" TEXT NOT NULL,
    "safra" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pontos_monitoramento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pontos_monitoramento_propriedade_id_tipo_praga_nome_safra_key" ON "pontos_monitoramento"("propriedade_id", "tipo_praga", "nome", "safra");
CREATE INDEX "pontos_monitoramento_propriedade_id_tipo_praga_safra_idx" ON "pontos_monitoramento"("propriedade_id", "tipo_praga", "safra");

-- CreateTable
CREATE TABLE "armadilhas" (
    "id" TEXT NOT NULL,
    "ponto_monitoramento_id" TEXT NOT NULL,
    "talhao_id" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "armadilhas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "armadilhas_ponto_monitoramento_id_idx" ON "armadilhas"("ponto_monitoramento_id");
CREATE INDEX "armadilhas_talhao_id_idx" ON "armadilhas"("talhao_id");

-- CreateTable
CREATE TABLE "leituras_armadilha" (
    "id" TEXT NOT NULL,
    "armadilha_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leituras_armadilha_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leituras_armadilha_armadilha_id_data_idx" ON "leituras_armadilha"("armadilha_id", "data");

-- AddForeignKey
ALTER TABLE "pontos_monitoramento" ADD CONSTRAINT "pontos_monitoramento_propriedade_id_fkey" FOREIGN KEY ("propriedade_id") REFERENCES "propriedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "armadilhas" ADD CONSTRAINT "armadilhas_ponto_monitoramento_id_fkey" FOREIGN KEY ("ponto_monitoramento_id") REFERENCES "pontos_monitoramento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "armadilhas" ADD CONSTRAINT "armadilhas_talhao_id_fkey" FOREIGN KEY ("talhao_id") REFERENCES "talhoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leituras_armadilha" ADD CONSTRAINT "leituras_armadilha_armadilha_id_fkey" FOREIGN KEY ("armadilha_id") REFERENCES "armadilhas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

No backfill in this migration — the historical spreadsheet import (Task 10) needs to match talhões by name and is safer done as a reviewable script than raw SQL, per the spec.

- [ ] **Step 3: Apply the migration and regenerate the client**

Run:
```bash
npx prisma migrate deploy
npx prisma generate
```
Expected: both commands exit 0; `src/generated/prisma/enums.ts` now exports `TipoPraga`, and `src/generated/prisma/models/` gains `PontoMonitoramento.ts`, `Armadilha.ts`, `LeituraArmadilha.ts`.

- [ ] **Step 4: Add the three propriedade guard helpers**

In `src/lib/propriedade.ts`, add at the end of the file (same pattern as the existing `garantirXDaPropriedade` functions):

```ts
export async function garantirPontoMonitoramentoDaPropriedade(pontoId: string, propriedadeId: string): Promise<boolean> {
  const ponto = await db.pontoMonitoramento.findUnique({ where: { id: pontoId }, select: { propriedadeId: true } });
  return ponto?.propriedadeId === propriedadeId;
}

export async function garantirArmadilhaDaPropriedade(armadilhaId: string, propriedadeId: string): Promise<boolean> {
  const armadilha = await db.armadilha.findUnique({
    where: { id: armadilhaId },
    select: { pontoMonitoramento: { select: { propriedadeId: true } } },
  });
  return armadilha?.pontoMonitoramento.propriedadeId === propriedadeId;
}

export async function garantirLeituraDaPropriedade(leituraId: string, propriedadeId: string): Promise<boolean> {
  const leitura = await db.leituraArmadilha.findUnique({
    where: { id: leituraId },
    select: { armadilha: { select: { pontoMonitoramento: { select: { propriedadeId: true } } } } },
  });
  return leitura?.armadilha.pontoMonitoramento.propriedadeId === propriedadeId;
}
```

- [ ] **Step 5: Verify the build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260822130000_monitoramento_pragas src/lib/propriedade.ts
git commit -m "Adiciona schema do Monitoramento de Pragas (Ponto/Armadilha/Leitura)"
```

---

### Task 2: `src/lib/pragas.ts` — cálculo puro do nível de controle (com testes)

**Files:**
- Create: `src/lib/pragas.ts`
- Create: `src/lib/pragas.test.ts`
- Modify: `package.json` (add `vitest` devDependency + `test` script)
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: `TipoPraga` from `@/generated/prisma/enums` (Task 1).
- Produces (used by Tasks 5, 6, 7, 8): `TIPO_PRAGA_LABELS: Record<TipoPraga, string>`, `NivelControle = "BAIXO" | "ATENCAO" | "CONTROLE"`, `CORES_NIVEL: Record<NivelControle, { badge: string; texto: string }>`, `mediaPonto(quantidades: number[]): number`, `ArmadilhaLeituraBruta = { data: Date; quantidade: number }`, `agruparMediaPorData(leituras: ArmadilhaLeituraBruta[]): { data: Date; media: number }[]`, `type LeituraPontoResumo = { data: Date; mediaAtual: number; metrica: number; nivel: NivelControle }`, `calcularSerieNivelControle(tipoPraga: TipoPraga, leiturasPorData: { data: Date; media: number }[]): LeituraPontoResumo[]`, `statusAtualPonto(tipoPraga: TipoPraga, leiturasBrutas: ArmadilhaLeituraBruta[]): LeituraPontoResumo | null`.

- [ ] **Step 1: Install Vitest**

Run: `npm install --save-dev vitest`

Add to `package.json` `scripts`:
```json
"test": "vitest run"
```

Create `vitest.config.ts` at the repo root:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/pragas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  mediaPonto,
  agruparMediaPorData,
  calcularSerieNivelControle,
  statusAtualPonto,
  avaliarNivelControle,
} from "@/lib/pragas";

describe("mediaPonto", () => {
  it("retorna 0 para lista vazia", () => {
    expect(mediaPonto([])).toBe(0);
  });

  it("calcula a média simples", () => {
    expect(mediaPonto([10, 20, 30])).toBe(20);
  });
});

describe("agruparMediaPorData", () => {
  it("agrupa leituras de várias armadilhas na mesma data e calcula a média", () => {
    const d1 = new Date("2026-08-11T00:00:00.000Z");
    const d2 = new Date("2026-08-14T00:00:00.000Z");
    const resultado = agruparMediaPorData([
      { data: d1, quantidade: 41 },
      { data: d1, quantidade: 18 },
      { data: d1, quantidade: 17 },
      { data: d2, quantidade: 4 },
      { data: d2, quantidade: 13 },
    ]);
    expect(resultado).toEqual([
      { data: d1, media: 25.333333333333332 },
      { data: d2, media: 8.5 },
    ]);
  });

  it("ordena o resultado por data crescente independente da ordem de entrada", () => {
    const d1 = new Date("2026-08-11T00:00:00.000Z");
    const d2 = new Date("2026-08-14T00:00:00.000Z");
    const resultado = agruparMediaPorData([
      { data: d2, quantidade: 10 },
      { data: d1, quantidade: 20 },
    ]);
    expect(resultado.map((r) => r.data.getTime())).toEqual([d1.getTime(), d2.getTime()]);
  });
});

describe("avaliarNivelControle", () => {
  it("BONAGOTA/GRAPHOLITA/CYDIA: baixo abaixo de 10, atenção de 10 a 19, controle a partir de 20", () => {
    expect(avaliarNivelControle("BONAGOTA", 9.99)).toBe("BAIXO");
    expect(avaliarNivelControle("BONAGOTA", 10)).toBe("ATENCAO");
    expect(avaliarNivelControle("BONAGOTA", 19.99)).toBe("ATENCAO");
    expect(avaliarNivelControle("BONAGOTA", 20)).toBe("CONTROLE");
    expect(avaliarNivelControle("GRAPHOLITA_MOLESTA", 20)).toBe("CONTROLE");
    expect(avaliarNivelControle("CYDIA", 20)).toBe("CONTROLE");
  });

  it("MOSCA_DAS_FRUTAS: baixo abaixo de 0.3, atenção de 0.3 a 0.49, controle a partir de 0.5", () => {
    expect(avaliarNivelControle("MOSCA_DAS_FRUTAS", 0.29)).toBe("BAIXO");
    expect(avaliarNivelControle("MOSCA_DAS_FRUTAS", 0.3)).toBe("ATENCAO");
    expect(avaliarNivelControle("MOSCA_DAS_FRUTAS", 0.49)).toBe("ATENCAO");
    expect(avaliarNivelControle("MOSCA_DAS_FRUTAS", 0.5)).toBe("CONTROLE");
  });
});

// Valores reais da aba "Pomo Sul" da planilha Monitoramento_2026-2027.xlsx,
// ponto "SEDE" (Grapholita molesta), datas 04/08 a 21/08/2026 — confirma que
// a série replica exatamente a coluna "Soma 2 leit." da planilha original.
describe("calcularSerieNivelControle — Grapholita/Bonagota/Cydia (soma das 2 últimas médias)", () => {
  it("reproduz a soma semanal real do ponto SEDE (Pomo Sul, safra 2026/2027)", () => {
    const datas = ["2026-08-04", "2026-08-07", "2026-08-11", "2026-08-14", "2026-08-18", "2026-08-21"].map(
      (s) => new Date(`${s}T00:00:00.000Z`),
    );
    const medias = [0, 0, 25.333333333333332, 5.666666666666667, 14, 28];
    const leiturasPorData = datas.map((data, i) => ({ data, media: medias[i] }));

    const serie = calcularSerieNivelControle("GRAPHOLITA_MOLESTA", leiturasPorData);

    expect(serie.map((s) => s.metrica)).toEqual([0, 0, 25.333333333333332, 31, 19.666666666666668, 42]);
    // 19.666... < 20 (limiar de controle) -> ATENCAO nesse ponto da série, não CONTROLE.
    // (Corrigido durante a Task 2: o rascunho original deste plano tinha esse valor errado.)
    expect(serie.map((s) => s.nivel)).toEqual(["BAIXO", "BAIXO", "CONTROLE", "CONTROLE", "ATENCAO", "CONTROLE"]);
  });

  it("primeira leitura do ponto usa só a média atual (sem leitura anterior)", () => {
    const serie = calcularSerieNivelControle("BONAGOTA", [{ data: new Date("2026-08-04T00:00:00.000Z"), media: 12 }]);
    expect(serie).toEqual([
      { data: new Date("2026-08-04T00:00:00.000Z"), mediaAtual: 12, metrica: 12, nivel: "ATENCAO" },
    ]);
  });
});

describe("calcularSerieNivelControle — Moscas-das-frutas (MAD = soma das 2 últimas médias ÷ 7)", () => {
  it("calcula o MAD e aplica os limiares de 0,3 e 0,5", () => {
    const d1 = new Date("2026-08-04T00:00:00.000Z");
    const d2 = new Date("2026-08-07T00:00:00.000Z");
    const serie = calcularSerieNivelControle("MOSCA_DAS_FRUTAS", [
      { data: d1, media: 1.05 },
      { data: d2, media: 1.05 },
    ]);
    // MAD do dia 2 = (1.05 + 1.05) / 7 = 0.3 -> exatamente no limiar de atenção
    expect(serie[1].metrica).toBeCloseTo(0.3, 10);
    expect(serie[1].nivel).toBe("ATENCAO");
  });
});

describe("statusAtualPonto", () => {
  it("retorna null quando o ponto não tem nenhuma leitura", () => {
    expect(statusAtualPonto("BONAGOTA", [])).toBeNull();
  });

  it("retorna o status da leitura mais recente", () => {
    const d1 = new Date("2026-08-04T00:00:00.000Z");
    const d2 = new Date("2026-08-07T00:00:00.000Z");
    const status = statusAtualPonto("BONAGOTA", [
      { data: d1, quantidade: 5 },
      { data: d2, quantidade: 25 },
    ]);
    expect(status?.data).toEqual(d2);
    expect(status?.nivel).toBe("CONTROLE");
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/pragas.test.ts`
Expected: FAIL — `Cannot find module '@/lib/pragas'` (file doesn't exist yet).

- [ ] **Step 4: Implement `src/lib/pragas.ts`**

```ts
import type { TipoPraga } from "@/generated/prisma/enums";

export const TIPO_PRAGA_LABELS: Record<TipoPraga, string> = {
  GRAPHOLITA_MOLESTA: "Grapholita molesta",
  MOSCA_DAS_FRUTAS: "Moscas-das-frutas",
  BONAGOTA: "Bonagota (Lagarta Enroladeira)",
  CYDIA: "Cydia",
};

export type NivelControle = "BAIXO" | "ATENCAO" | "CONTROLE";

export const CORES_NIVEL: Record<NivelControle, { badge: string; texto: string }> = {
  BAIXO: { badge: "border-green-200 bg-green-50 text-green-800", texto: "Baixo" },
  ATENCAO: { badge: "border-amber-200 bg-amber-50 text-amber-800", texto: "Atenção" },
  CONTROLE: { badge: "border-red-200 bg-red-50 text-red-800", texto: "Nível de controle" },
};

type Limiares = { atencao: number; controle: number };

// Limiares replicados das fórmulas reais da planilha Monitoramento_2026-2027.xlsx
// (colunas "Soma 2 leit." e formatação condicional) e do valor oficial da
// Embrapa para Grapholita molesta (20/semana — ajustado do valor de 30 usado
// antes na planilha; decisão registrada na spec desta funcionalidade).
const LIMIARES_SOMA_SEMANA: Limiares = { atencao: 10, controle: 20 };
const LIMIARES_MAD: Limiares = { atencao: 0.3, controle: 0.5 };

function limiaresDaPraga(tipoPraga: TipoPraga): Limiares {
  return tipoPraga === "MOSCA_DAS_FRUTAS" ? LIMIARES_MAD : LIMIARES_SOMA_SEMANA;
}

export function avaliarNivelControle(tipoPraga: TipoPraga, metrica: number): NivelControle {
  const limiares = limiaresDaPraga(tipoPraga);
  if (metrica >= limiares.controle) return "CONTROLE";
  if (metrica >= limiares.atencao) return "ATENCAO";
  return "BAIXO";
}

/** Média das quantidades de todas as armadilhas ativas do ponto numa mesma data. */
export function mediaPonto(quantidades: number[]): number {
  if (quantidades.length === 0) return 0;
  return quantidades.reduce((soma, q) => soma + q, 0) / quantidades.length;
}

export type ArmadilhaLeituraBruta = { data: Date; quantidade: number };

/** Agrupa leituras de várias armadilhas do mesmo ponto por data e calcula a média de cada data. */
export function agruparMediaPorData(leituras: ArmadilhaLeituraBruta[]): { data: Date; media: number }[] {
  const porData = new Map<number, number[]>();
  for (const leitura of leituras) {
    const chave = leitura.data.getTime();
    porData.set(chave, [...(porData.get(chave) ?? []), leitura.quantidade]);
  }
  return Array.from(porData.entries())
    .map(([timestamp, quantidades]) => ({ data: new Date(timestamp), media: mediaPonto(quantidades) }))
    .sort((a, b) => a.data.getTime() - b.data.getTime());
}

export type LeituraPontoResumo = {
  data: Date;
  mediaAtual: number;
  metrica: number;
  nivel: NivelControle;
};

/**
 * Para Grapholita molesta, Bonagota e Cydia, a métrica é a soma da média atual
 * com a média da leitura anterior do mesmo ponto (equivalente semanal, já que
 * a leitura é ~2x/semana). Para Moscas-das-frutas é o MAD (Média de Moscas por
 * Armadilha por Dia): a mesma soma dividida por 7. Replica exatamente as
 * colunas "Soma 2 leit." da planilha original.
 */
export function metricaControle(tipoPraga: TipoPraga, mediaAtual: number, mediaAnterior: number | null): number {
  const soma = mediaAtual + (mediaAnterior ?? 0);
  return tipoPraga === "MOSCA_DAS_FRUTAS" ? soma / 7 : soma;
}

/**
 * A partir da série de médias por data de um ponto (ordem cronológica não é
 * exigida — a função ordena internamente), calcula a métrica de controle e o
 * nível de cada data, usando a leitura imediatamente anterior do mesmo ponto.
 */
export function calcularSerieNivelControle(
  tipoPraga: TipoPraga,
  leiturasPorData: { data: Date; media: number }[],
): LeituraPontoResumo[] {
  const ordenadas = [...leiturasPorData].sort((a, b) => a.data.getTime() - b.data.getTime());
  return ordenadas.map((atual, i) => {
    const anterior = i > 0 ? ordenadas[i - 1].media : null;
    const metrica = metricaControle(tipoPraga, atual.media, anterior);
    return { data: atual.data, mediaAtual: atual.media, metrica, nivel: avaliarNivelControle(tipoPraga, metrica) };
  });
}

/** Status do ponto na leitura mais recente — null se o ponto ainda não tem nenhuma leitura. */
export function statusAtualPonto(tipoPraga: TipoPraga, leiturasBrutas: ArmadilhaLeituraBruta[]): LeituraPontoResumo | null {
  const porData = agruparMediaPorData(leiturasBrutas);
  const serie = calcularSerieNivelControle(tipoPraga, porData);
  return serie.at(-1) ?? null;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/pragas.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/pragas.ts src/lib/pragas.test.ts
git commit -m "Adiciona lib/pragas.ts: cálculo do nível de controle, com testes"
```

---

### Task 3: Pontos de Monitoramento — CRUD

**Files:**
- Create: `src/actions/pragas.ts` (this task starts the file; Tasks 4-6 append to it)
- Create: `src/components/pragas/ponto-form.tsx`
- Create: `src/components/pragas/excluir-ponto-form.tsx`
- Create: `src/app/(app)/monitoramento-pragas/pontos/page.tsx`
- Create: `src/app/(app)/monitoramento-pragas/pontos/novo/page.tsx`
- Create: `src/app/(app)/monitoramento-pragas/pontos/[id]/page.tsx`
- Create: `src/app/(app)/monitoramento-pragas/pontos/[id]/editar/page.tsx`

**Interfaces:**
- Consumes: `TIPO_PRAGA_LABELS`, `garantirPontoMonitoramentoDaPropriedade`, `exigirPropriedadeAtual`, `ehValorDoEnum`, `ConfirmarExclusao`, `useFormularioAcao`.
- Produces (used by Tasks 5, 7): `criarPontoMonitoramento`, `atualizarPontoMonitoramento`, `alternarAtivoPontoMonitoramento`, `excluirPontoMonitoramento` server actions in `src/actions/pragas.ts`.

- [ ] **Step 1: Write the server actions**

Create `src/actions/pragas.ts`:

```ts
"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { TipoPraga } from "@/generated/prisma/enums";
import { ehValorDoEnum } from "@/lib/enum";
import {
  exigirPropriedadeAtual,
  garantirPontoMonitoramentoDaPropriedade,
} from "@/lib/propriedade";

// --- Pontos de Monitoramento ------------------------------------------------

function lerFormularioPonto(formData: FormData) {
  return {
    tipoPraga: String(formData.get("tipoPraga") ?? ""),
    nome: String(formData.get("nome") ?? "").trim(),
    safra: String(formData.get("safra") ?? "").trim(),
  };
}

function validarPonto(dados: ReturnType<typeof lerFormularioPonto>) {
  if (!dados.nome || !dados.safra) return "Preencha o nome do ponto e a safra.";
  if (!ehValorDoEnum(TipoPraga, dados.tipoPraga)) return "Selecione uma praga válida.";
  return undefined;
}

export async function criarPontoMonitoramento(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioPonto(formData);
  const erro = validarPonto(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  const tipoPraga = dados.tipoPraga as TipoPraga;

  const existente = await db.pontoMonitoramento.findUnique({
    where: { propriedadeId_tipoPraga_nome_safra: { propriedadeId, tipoPraga, nome: dados.nome, safra: dados.safra } },
  });
  if (existente) return "Já existe um ponto com esse nome, praga e safra nesta propriedade.";

  const ponto = await db.pontoMonitoramento.create({
    data: { propriedadeId, tipoPraga, nome: dados.nome, safra: dados.safra },
  });

  revalidatePath("/monitoramento-pragas/pontos");
  redirect(`/monitoramento-pragas/pontos/${ponto.id}`);
}

export async function atualizarPontoMonitoramento(
  pontoId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioPonto(formData);
  const erro = validarPonto(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirPontoMonitoramentoDaPropriedade(pontoId, propriedadeId))) return "Ponto inválido.";

  await db.pontoMonitoramento.update({
    where: { id: pontoId },
    data: { tipoPraga: dados.tipoPraga as TipoPraga, nome: dados.nome, safra: dados.safra },
  });

  revalidatePath("/monitoramento-pragas/pontos");
  revalidatePath(`/monitoramento-pragas/pontos/${pontoId}`);
  redirect(`/monitoramento-pragas/pontos/${pontoId}`);
}

export async function alternarAtivoPontoMonitoramento(pontoId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  const ponto = await db.pontoMonitoramento.findUnique({ where: { id: pontoId }, select: { propriedadeId: true, ativo: true } });
  if (!ponto || ponto.propriedadeId !== propriedadeId) return;

  await db.pontoMonitoramento.update({ where: { id: pontoId }, data: { ativo: !ponto.ativo } });
  revalidatePath("/monitoramento-pragas/pontos");
  revalidatePath(`/monitoramento-pragas/pontos/${pontoId}`);
}

export async function excluirPontoMonitoramento(pontoId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirPontoMonitoramentoDaPropriedade(pontoId, propriedadeId))) return;

  // Só bloqueia a exclusão definitiva se alguma armadilha do ponto já tem
  // leitura registrada de verdade — apagar quebraria esse histórico.
  const totalLeituras = await db.leituraArmadilha.count({ where: { armadilha: { pontoMonitoramentoId: pontoId } } });

  if (totalLeituras === 0) {
    await db.$transaction([
      db.armadilha.deleteMany({ where: { pontoMonitoramentoId: pontoId } }),
      db.pontoMonitoramento.delete({ where: { id: pontoId } }),
    ]);
    revalidatePath("/monitoramento-pragas/pontos");
    redirect("/monitoramento-pragas/pontos?resultado=excluido");
  } else {
    await db.pontoMonitoramento.update({ where: { id: pontoId }, data: { ativo: false } });
    revalidatePath("/monitoramento-pragas/pontos");
    redirect("/monitoramento-pragas/pontos?resultado=inativado");
  }
}
```

- [ ] **Step 2: Build the reusable form and delete components**

Create `src/components/pragas/ponto-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";
import { TIPO_PRAGA_LABELS } from "@/lib/pragas";

export type ValoresIniciaisPonto = {
  tipoPraga: string;
  nome: string;
  safra: string;
};

type PontoAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function PontoForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: PontoAction;
  defaultValues?: Partial<ValoresIniciaisPonto>;
  submitLabel: string;
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);
  const [safra, setSafra] = useState(defaultValues?.safra ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="tipoPraga" className="mb-1 block text-sm font-medium text-neutral-700">
          Praga *
        </label>
        <select
          id="tipoPraga"
          name="tipoPraga"
          required
          defaultValue={defaultValues?.tipoPraga ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {Object.entries(TIPO_PRAGA_LABELS).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-neutral-700">
          Nome do ponto *
        </label>
        <input
          id="nome"
          name="nome"
          required
          placeholder="ex: SEDE, Gala, Firminha"
          defaultValue={defaultValues?.nome}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Agrupa as armadilhas avaliadas em conjunto (a média do grupo é o que define o nível de controle).
        </p>
      </div>

      <div>
        <label htmlFor="safra" className="mb-1 block text-sm font-medium text-neutral-700">
          Safra *
        </label>
        <input
          id="safra"
          name="safra"
          required
          placeholder="ex: 2026/2027"
          value={safra}
          onChange={(e) => setSafra(e.target.value)}
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

Create `src/components/pragas/excluir-ponto-form.tsx`:

```tsx
"use client";

import { excluirPontoMonitoramento } from "@/actions/pragas";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export function ExcluirPontoForm({ pontoId }: { pontoId: string }) {
  return (
    <ConfirmarExclusao
      action={excluirPontoMonitoramento.bind(null, pontoId)}
      pergunta="Confirma excluir este ponto? Se já houver leitura registrada, ele será apenas desativado."
    />
  );
}
```

- [ ] **Step 3: Build the four pages**

Create `src/app/(app)/monitoramento-pragas/pontos/page.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS } from "@/lib/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function PontosMonitoramentoPage({
  searchParams,
}: {
  searchParams: Promise<{ resultado?: string }>;
}) {
  const { resultado } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const pontos = await db.pontoMonitoramento.findMany({
    where: { propriedadeId },
    orderBy: [{ safra: "desc" }, { tipoPraga: "asc" }, { nome: "asc" }],
    include: { _count: { select: { armadilhas: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/monitoramento-pragas" label="Voltar" />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Pontos de Monitoramento</h1>
        <Link
          href="/monitoramento-pragas/pontos/novo"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Novo ponto
        </Link>
      </div>

      {resultado === "excluido" && <p className="text-sm text-green-700">Ponto excluído.</p>}
      {resultado === "inativado" && (
        <p className="text-sm text-amber-700">
          Este ponto já tem leitura registrada e não pode ser excluído — foi apenas desativado.
        </p>
      )}

      {pontos.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum ponto de monitoramento cadastrado ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {pontos.map((p) => (
            <Link
              key={p.id}
              href={`/monitoramento-pragas/pontos/${p.id}`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {p.nome} {!p.ativo && <span className="text-xs font-normal text-neutral-400">(inativo)</span>}
                </p>
                <p className="text-xs text-neutral-500">
                  {TIPO_PRAGA_LABELS[p.tipoPraga]} · safra {p.safra} · {p._count.armadilhas} armadilha
                  {p._count.armadilhas === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

Create `src/app/(app)/monitoramento-pragas/pontos/novo/page.tsx`:

```tsx
import { PontoForm } from "@/components/pragas/ponto-form";
import { criarPontoMonitoramento } from "@/actions/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default function NovoPontoPage() {
  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/monitoramento-pragas/pontos" label="Voltar" />
      <h1 className="text-xl font-semibold text-neutral-900">Novo ponto de monitoramento</h1>
      <PontoForm action={criarPontoMonitoramento} submitLabel="Criar ponto" />
    </div>
  );
}
```

Create `src/app/(app)/monitoramento-pragas/pontos/[id]/editar/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { PontoForm } from "@/components/pragas/ponto-form";
import { ExcluirPontoForm } from "@/components/pragas/excluir-ponto-form";
import { atualizarPontoMonitoramento } from "@/actions/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarPontoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const ponto = await db.pontoMonitoramento.findUnique({ where: { id } });
  if (!ponto || ponto.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <VoltarLink href={`/monitoramento-pragas/pontos/${ponto.id}`} label="Voltar" />
        <ExcluirPontoForm pontoId={ponto.id} />
      </div>

      <h1 className="text-xl font-semibold text-neutral-900">Editar ponto — {ponto.nome}</h1>

      <PontoForm
        action={atualizarPontoMonitoramento.bind(null, ponto.id)}
        defaultValues={{ tipoPraga: ponto.tipoPraga, nome: ponto.nome, safra: ponto.safra }}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
```

Create `src/app/(app)/monitoramento-pragas/pontos/[id]/page.tsx` (detail + armadilhas list — leitura history is added in Task 6):

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS } from "@/lib/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function DetalhePontoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const ponto = await db.pontoMonitoramento.findUnique({
    where: { id },
    include: { armadilhas: { orderBy: { rotulo: "asc" }, include: { talhao: { select: { nomeCodinome: true } } } } },
  });
  if (!ponto || ponto.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <VoltarLink href="/monitoramento-pragas/pontos" label="Voltar" />
        <Link href={`/monitoramento-pragas/pontos/${ponto.id}/editar`} className="text-sm font-medium text-green-700">
          Editar ponto
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{ponto.nome}</h1>
        <p className="text-sm text-neutral-500">
          {TIPO_PRAGA_LABELS[ponto.tipoPraga]} · safra {ponto.safra} {!ponto.ativo && "· inativo"}
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-700">Armadilhas</p>
          <Link href={`/monitoramento-pragas/armadilhas/novo?pontoId=${ponto.id}`} className="text-sm font-medium text-green-700">
            + Nova armadilha
          </Link>
        </div>
        {ponto.armadilhas.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma armadilha cadastrada neste ponto ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ponto.armadilhas.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">
                  {a.rotulo} <span className="text-neutral-400">· {a.talhao.nomeCodinome}</span>
                  {!a.ativo && <span className="text-neutral-400"> (inativa)</span>}
                </span>
                <Link href={`/monitoramento-pragas/armadilhas/${a.id}/editar`} className="text-green-700">
                  Editar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify manually in the browser**

Run: `npm run build` (expect success), then use the preview tools: `preview_start` with the `dev` config, navigate to `/monitoramento-pragas/pontos`, create a point (e.g. praga "Bonagota", nome "SEDE", safra "2026/2027"), confirm it lists, edit it, confirm it saves, then delete it (no leituras yet, so it should hard-delete) and confirm the `?resultado=excluido` message shows.

- [ ] **Step 5: Commit**

```bash
git add src/actions/pragas.ts src/components/pragas/ponto-form.tsx src/components/pragas/excluir-ponto-form.tsx "src/app/(app)/monitoramento-pragas/pontos"
git commit -m "Adiciona CRUD de Pontos de Monitoramento"
```

---

### Task 4: Armadilhas — CRUD

**Files:**
- Modify: `src/actions/pragas.ts` (append)
- Create: `src/components/pragas/armadilha-form.tsx`
- Create: `src/components/pragas/excluir-armadilha-form.tsx`
- Create: `src/app/(app)/monitoramento-pragas/armadilhas/page.tsx`
- Create: `src/app/(app)/monitoramento-pragas/armadilhas/novo/page.tsx`
- Create: `src/app/(app)/monitoramento-pragas/armadilhas/[id]/editar/page.tsx`

**Interfaces:**
- Consumes: `garantirArmadilhaDaPropriedade`, `garantirTalhaoDaPropriedade` (`src/lib/propriedade.ts`), everything from Task 3.
- Produces (used by Task 5): `criarArmadilha`, `atualizarArmadilha`, `alternarAtivoArmadilha`, `excluirArmadilha`.

- [ ] **Step 1: Append the armadilha actions to `src/actions/pragas.ts`**

Add the import `garantirArmadilhaDaPropriedade, garantirTalhaoDaPropriedade` to the existing import from `@/lib/propriedade`, then append:

```ts
// --- Armadilhas -------------------------------------------------------------

function lerFormularioArmadilha(formData: FormData) {
  return {
    pontoMonitoramentoId: String(formData.get("pontoMonitoramentoId") ?? ""),
    talhaoId: String(formData.get("talhaoId") ?? ""),
    rotulo: String(formData.get("rotulo") ?? "").trim(),
  };
}

function validarArmadilha(dados: ReturnType<typeof lerFormularioArmadilha>) {
  if (!dados.pontoMonitoramentoId || !dados.talhaoId || !dados.rotulo) {
    return "Selecione o ponto de monitoramento, o talhão e informe o rótulo da armadilha.";
  }
  return undefined;
}

export async function criarArmadilha(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioArmadilha(formData);
  const erro = validarArmadilha(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirPontoMonitoramentoDaPropriedade(dados.pontoMonitoramentoId, propriedadeId))) {
    return "Ponto de monitoramento inválido para a propriedade atual.";
  }
  if (!(await garantirTalhaoDaPropriedade(dados.talhaoId, propriedadeId))) {
    return "Talhão inválido para a propriedade atual.";
  }

  await db.armadilha.create({
    data: { pontoMonitoramentoId: dados.pontoMonitoramentoId, talhaoId: dados.talhaoId, rotulo: dados.rotulo },
  });

  revalidatePath("/monitoramento-pragas/armadilhas");
  revalidatePath(`/monitoramento-pragas/pontos/${dados.pontoMonitoramentoId}`);
  redirect(`/monitoramento-pragas/pontos/${dados.pontoMonitoramentoId}`);
}

export async function atualizarArmadilha(
  armadilhaId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioArmadilha(formData);
  const erro = validarArmadilha(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirArmadilhaDaPropriedade(armadilhaId, propriedadeId))) return "Armadilha inválida.";
  if (!(await garantirPontoMonitoramentoDaPropriedade(dados.pontoMonitoramentoId, propriedadeId))) {
    return "Ponto de monitoramento inválido para a propriedade atual.";
  }
  if (!(await garantirTalhaoDaPropriedade(dados.talhaoId, propriedadeId))) {
    return "Talhão inválido para a propriedade atual.";
  }

  await db.armadilha.update({
    where: { id: armadilhaId },
    data: { pontoMonitoramentoId: dados.pontoMonitoramentoId, talhaoId: dados.talhaoId, rotulo: dados.rotulo },
  });

  revalidatePath("/monitoramento-pragas/armadilhas");
  revalidatePath(`/monitoramento-pragas/pontos/${dados.pontoMonitoramentoId}`);
  redirect(`/monitoramento-pragas/pontos/${dados.pontoMonitoramentoId}`);
}

export async function alternarAtivoArmadilha(armadilhaId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  const armadilha = await db.armadilha.findUnique({
    where: { id: armadilhaId },
    select: { ativo: true, pontoMonitoramentoId: true, pontoMonitoramento: { select: { propriedadeId: true } } },
  });
  if (!armadilha || armadilha.pontoMonitoramento.propriedadeId !== propriedadeId) return;

  await db.armadilha.update({ where: { id: armadilhaId }, data: { ativo: !armadilha.ativo } });
  revalidatePath("/monitoramento-pragas/armadilhas");
  revalidatePath(`/monitoramento-pragas/pontos/${armadilha.pontoMonitoramentoId}`);
}

export async function excluirArmadilha(armadilhaId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirArmadilhaDaPropriedade(armadilhaId, propriedadeId))) return;

  const armadilha = await db.armadilha.findUniqueOrThrow({
    where: { id: armadilhaId },
    select: { pontoMonitoramentoId: true },
  });
  const totalLeituras = await db.leituraArmadilha.count({ where: { armadilhaId } });

  if (totalLeituras === 0) {
    await db.armadilha.delete({ where: { id: armadilhaId } });
    revalidatePath("/monitoramento-pragas/armadilhas");
    revalidatePath(`/monitoramento-pragas/pontos/${armadilha.pontoMonitoramentoId}`);
    redirect(`/monitoramento-pragas/pontos/${armadilha.pontoMonitoramentoId}?resultado=excluido`);
  } else {
    await db.armadilha.update({ where: { id: armadilhaId }, data: { ativo: false } });
    revalidatePath("/monitoramento-pragas/armadilhas");
    revalidatePath(`/monitoramento-pragas/pontos/${armadilha.pontoMonitoramentoId}`);
    redirect(`/monitoramento-pragas/pontos/${armadilha.pontoMonitoramentoId}?resultado=inativado`);
  }
}
```

- [ ] **Step 2: Build the form and delete components**

Create `src/components/pragas/armadilha-form.tsx`:

```tsx
"use client";

import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type Ponto = { id: string; nome: string; safra: string };
type Talhao = { id: string; nome: string };

export type ValoresIniciaisArmadilha = {
  pontoMonitoramentoId: string;
  talhaoId: string;
  rotulo: string;
};

type ArmadilhaAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function ArmadilhaForm({
  action,
  pontos,
  talhoes,
  defaultValues,
  submitLabel,
}: {
  action: ArmadilhaAction;
  pontos: Ponto[];
  talhoes: Talhao[];
  defaultValues?: Partial<ValoresIniciaisArmadilha>;
  submitLabel: string;
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="pontoMonitoramentoId" className="mb-1 block text-sm font-medium text-neutral-700">
          Ponto de monitoramento *
        </label>
        <select
          id="pontoMonitoramentoId"
          name="pontoMonitoramentoId"
          required
          defaultValue={defaultValues?.pontoMonitoramentoId ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {pontos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} · safra {p.safra}
            </option>
          ))}
        </select>
      </div>

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

      <div>
        <label htmlFor="rotulo" className="mb-1 block text-sm font-medium text-neutral-700">
          Rótulo da armadilha *
        </label>
        <input
          id="rotulo"
          name="rotulo"
          required
          placeholder="ex: 4-Kampai 11"
          defaultValue={defaultValues?.rotulo}
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

Create `src/components/pragas/excluir-armadilha-form.tsx`:

```tsx
"use client";

import { excluirArmadilha } from "@/actions/pragas";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export function ExcluirArmadilhaForm({ armadilhaId }: { armadilhaId: string }) {
  return (
    <ConfirmarExclusao
      action={excluirArmadilha.bind(null, armadilhaId)}
      pergunta="Confirma excluir esta armadilha? Se já houver leitura registrada, ela será apenas desativada."
    />
  );
}
```

- [ ] **Step 3: Build the three pages**

Create `src/app/(app)/monitoramento-pragas/armadilhas/page.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS } from "@/lib/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function ArmadilhasPage() {
  const propriedadeId = await exigirPropriedadeAtual();

  const armadilhas = await db.armadilha.findMany({
    where: { pontoMonitoramento: { propriedadeId } },
    orderBy: [{ pontoMonitoramento: { safra: "desc" } }, { rotulo: "asc" }],
    include: { pontoMonitoramento: true, talhao: { select: { nomeCodinome: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/monitoramento-pragas" label="Voltar" />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Armadilhas</h1>
        <Link
          href="/monitoramento-pragas/armadilhas/novo"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova armadilha
        </Link>
      </div>

      {armadilhas.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma armadilha cadastrada ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {armadilhas.map((a) => (
            <Link
              key={a.id}
              href={`/monitoramento-pragas/armadilhas/${a.id}/editar`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {a.rotulo} {!a.ativo && <span className="text-xs font-normal text-neutral-400">(inativa)</span>}
                </p>
                <p className="text-xs text-neutral-500">
                  {a.talhao.nomeCodinome} · {TIPO_PRAGA_LABELS[a.pontoMonitoramento.tipoPraga]} · {a.pontoMonitoramento.nome} · safra{" "}
                  {a.pontoMonitoramento.safra}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

Create `src/app/(app)/monitoramento-pragas/armadilhas/novo/page.tsx`:

```tsx
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ArmadilhaForm } from "@/components/pragas/armadilha-form";
import { criarArmadilha } from "@/actions/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaArmadilhaPage({
  searchParams,
}: {
  searchParams: Promise<{ pontoId?: string }>;
}) {
  const { pontoId } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const [pontos, talhoes] = await Promise.all([
    db.pontoMonitoramento.findMany({
      where: { propriedadeId },
      orderBy: [{ safra: "desc" }, { nome: "asc" }],
      select: { id: true, nome: true, safra: true },
    }),
    db.talhao.findMany({ where: { propriedadeId }, orderBy: { nomeCodinome: "asc" }, select: { id: true, nomeCodinome: true } }),
  ]);

  if (pontos.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <VoltarLink href="/monitoramento-pragas/armadilhas" label="Voltar" />
        <h1 className="text-xl font-semibold text-neutral-900">Nova armadilha</h1>
        <p className="text-sm text-neutral-500">
          Cadastre um ponto de monitoramento antes de registrar uma armadilha.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/monitoramento-pragas/armadilhas" label="Voltar" />
      <h1 className="text-xl font-semibold text-neutral-900">Nova armadilha</h1>
      <ArmadilhaForm
        action={criarArmadilha}
        pontos={pontos.map((p) => ({ id: p.id, nome: p.nome, safra: p.safra }))}
        talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nomeCodinome }))}
        defaultValues={pontoId ? { pontoMonitoramentoId: pontoId } : undefined}
        submitLabel="Criar armadilha"
      />
    </div>
  );
}
```

Create `src/app/(app)/monitoramento-pragas/armadilhas/[id]/editar/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ArmadilhaForm } from "@/components/pragas/armadilha-form";
import { ExcluirArmadilhaForm } from "@/components/pragas/excluir-armadilha-form";
import { atualizarArmadilha } from "@/actions/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarArmadilhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const armadilha = await db.armadilha.findUnique({ where: { id }, include: { pontoMonitoramento: true } });
  if (!armadilha || armadilha.pontoMonitoramento.propriedadeId !== propriedadeId) notFound();

  const [pontos, talhoes] = await Promise.all([
    db.pontoMonitoramento.findMany({
      where: { propriedadeId },
      orderBy: [{ safra: "desc" }, { nome: "asc" }],
      select: { id: true, nome: true, safra: true },
    }),
    db.talhao.findMany({ where: { propriedadeId }, orderBy: { nomeCodinome: "asc" }, select: { id: true, nomeCodinome: true } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <VoltarLink href="/monitoramento-pragas/armadilhas" label="Voltar" />
        <ExcluirArmadilhaForm armadilhaId={armadilha.id} />
      </div>

      <h1 className="text-xl font-semibold text-neutral-900">Editar armadilha — {armadilha.rotulo}</h1>

      <ArmadilhaForm
        action={atualizarArmadilha.bind(null, armadilha.id)}
        pontos={pontos.map((p) => ({ id: p.id, nome: p.nome, safra: p.safra }))}
        talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nomeCodinome }))}
        defaultValues={{
          pontoMonitoramentoId: armadilha.pontoMonitoramentoId,
          talhaoId: armadilha.talhaoId,
          rotulo: armadilha.rotulo,
        }}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify manually in the browser**

Run: `npm run build`, then in the preview create an armadilha under the point created in Task 3, confirm it shows on `/monitoramento-pragas/armadilhas` and on the point's detail page, edit it, then delete it.

- [ ] **Step 5: Commit**

```bash
git add src/actions/pragas.ts src/components/pragas/armadilha-form.tsx src/components/pragas/excluir-armadilha-form.tsx "src/app/(app)/monitoramento-pragas/armadilhas"
git commit -m "Adiciona CRUD de Armadilhas"
```

---

### Task 5: Grade de lançamento (lançar contagens em lote)

**Files:**
- Modify: `src/actions/pragas.ts` (append `criarLeiturasEmLote`)
- Create: `src/components/pragas/grade-leituras-form.tsx`
- Create: `src/app/(app)/monitoramento-pragas/nova/page.tsx`

**Interfaces:**
- Consumes: `TIPO_PRAGA_LABELS`, `ehValorDoEnum`, `exigirPropriedadeAtual`.
- Produces (used by Task 7 for the "+ Nova leitura" link): route `/monitoramento-pragas/nova`.

- [ ] **Step 1: Append the batch-create action**

Add to `src/actions/pragas.ts`:

```ts
// --- Leituras (lançamento em lote) ------------------------------------------

export async function criarLeiturasEmLote(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const tipoPragaRaw = String(formData.get("tipoPraga") ?? "");
  const safra = String(formData.get("safra") ?? "").trim();
  const dataStr = String(formData.get("data") ?? "");
  const armadilhaIds = formData.getAll("armadilhaId[]").map(String);
  const quantidadesRaw = formData.getAll("quantidade[]").map(String);

  if (!ehValorDoEnum(TipoPraga, tipoPragaRaw)) return "Praga inválida.";
  if (!safra || !dataStr) return "Selecione a safra e a data da leitura.";

  const itens = armadilhaIds
    .map((armadilhaId, i) => ({ armadilhaId, quantidadeRaw: quantidadesRaw[i] ?? "" }))
    .filter((item) => item.quantidadeRaw !== "");

  if (itens.length === 0) return "Preencha ao menos uma armadilha antes de salvar.";
  if (itens.some((item) => !Number.isFinite(Number(item.quantidadeRaw)) || Number(item.quantidadeRaw) < 0)) {
    return "As quantidades devem ser números inteiros não negativos.";
  }

  const propriedadeId = await exigirPropriedadeAtual();

  const armadilhas = await db.armadilha.findMany({
    where: { id: { in: itens.map((i) => i.armadilhaId) } },
    select: { id: true, pontoMonitoramento: { select: { propriedadeId: true } } },
  });
  const idsValidos = new Set(
    armadilhas.filter((a) => a.pontoMonitoramento.propriedadeId === propriedadeId).map((a) => a.id),
  );
  if (itens.some((item) => !idsValidos.has(item.armadilhaId))) {
    return "Uma das armadilhas não pertence à propriedade atual.";
  }

  const data = new Date(dataStr);
  await db.leituraArmadilha.createMany({
    data: itens.map((item) => ({ armadilhaId: item.armadilhaId, data, quantidade: Number(item.quantidadeRaw) })),
  });

  revalidatePath("/monitoramento-pragas");
  redirect(`/monitoramento-pragas?tipoPraga=${tipoPragaRaw}&safra=${encodeURIComponent(safra)}`);
}
```

- [ ] **Step 2: Build the grid form component**

Create `src/components/pragas/grade-leituras-form.tsx`:

```tsx
"use client";

import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type ArmadilhaGrade = { id: string; rotulo: string; talhaoNome: string };
type PontoGrade = { id: string; nome: string; armadilhas: ArmadilhaGrade[] };

type GradeAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function GradeLeiturasForm({
  action,
  tipoPraga,
  safra,
  pontos,
}: {
  action: GradeAction;
  tipoPraga: string;
  safra: string;
  pontos: PontoGrade[];
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="tipoPraga" value={tipoPraga} />
      <input type="hidden" name="safra" value={safra} />

      <div>
        <label htmlFor="data" className="mb-1 block text-sm font-medium text-neutral-700">
          Data da leitura *
        </label>
        <input
          id="data"
          name="data"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      {pontos.map((ponto) => (
        <div key={ponto.id} className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-neutral-900">{ponto.nome}</p>
          {ponto.armadilhas.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma armadilha ativa neste ponto.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {ponto.armadilhas.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3">
                  <label htmlFor={`quantidade-${a.id}`} className="flex-1 text-sm text-neutral-600">
                    {a.rotulo} <span className="text-neutral-400">· {a.talhaoNome}</span>
                  </label>
                  <input type="hidden" name="armadilhaId[]" value={a.id} />
                  <input
                    id={`quantidade-${a.id}`}
                    name="quantidade[]"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step="1"
                    className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {erro}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-green-700 py-3 text-base font-medium text-white active:bg-green-800 disabled:opacity-60"
      >
        {rotulo("Salvar leituras")}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Build the page (filter + grid)**

Create `src/app/(app)/monitoramento-pragas/nova/page.tsx`:

```tsx
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS } from "@/lib/pragas";
import { TipoPraga } from "@/generated/prisma/enums";
import { ehValorDoEnum } from "@/lib/enum";
import { criarLeiturasEmLote } from "@/actions/pragas";
import { GradeLeiturasForm } from "@/components/pragas/grade-leituras-form";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaLeituraPage({
  searchParams,
}: {
  searchParams: Promise<{ tipoPraga?: string; safra?: string }>;
}) {
  const { tipoPraga, safra } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const pontosDisponiveis = await db.pontoMonitoramento.findMany({
    where: { propriedadeId, ativo: true },
    orderBy: [{ safra: "desc" }, { tipoPraga: "asc" }],
    select: { tipoPraga: true, safra: true },
    distinct: ["tipoPraga", "safra"],
  });

  const tipoPragaValido = tipoPraga && ehValorDoEnum(TipoPraga, tipoPraga) ? (tipoPraga as TipoPraga) : undefined;
  const safrasDaPraga = tipoPragaValido
    ? pontosDisponiveis.filter((p) => p.tipoPraga === tipoPragaValido).map((p) => p.safra)
    : [];
  const safraValida = safra && safrasDaPraga.includes(safra) ? safra : undefined;

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/monitoramento-pragas" label="Voltar" />
      <h1 className="text-xl font-semibold text-neutral-900">Nova leitura</h1>

      <form className="flex flex-wrap gap-2">
        <select
          name="tipoPraga"
          defaultValue={tipoPragaValido ?? ""}
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="" disabled>
            Selecione a praga...
          </option>
          {Array.from(new Set(pontosDisponiveis.map((p) => p.tipoPraga))).map((tp) => (
            <option key={tp} value={tp}>
              {TIPO_PRAGA_LABELS[tp]}
            </option>
          ))}
        </select>
        <select
          name="safra"
          defaultValue={safraValida ?? ""}
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="" disabled>
            Selecione a safra...
          </option>
          {Array.from(new Set(safrasDaPraga)).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700">
          Continuar
        </button>
      </form>

      {tipoPragaValido && safraValida && (
        <PontosParaLancamento propriedadeId={propriedadeId} tipoPraga={tipoPragaValido} safra={safraValida} />
      )}
    </div>
  );
}

async function PontosParaLancamento({
  propriedadeId,
  tipoPraga,
  safra,
}: {
  propriedadeId: string;
  tipoPraga: TipoPraga;
  safra: string;
}) {
  const pontos = await db.pontoMonitoramento.findMany({
    where: { propriedadeId, tipoPraga, safra, ativo: true },
    orderBy: { nome: "asc" },
    include: {
      armadilhas: {
        where: { ativo: true },
        orderBy: { rotulo: "asc" },
        include: { talhao: { select: { nomeCodinome: true } } },
      },
    },
  });

  return (
    <GradeLeiturasForm
      action={criarLeiturasEmLote}
      tipoPraga={tipoPraga}
      safra={safra}
      pontos={pontos.map((p) => ({
        id: p.id,
        nome: p.nome,
        armadilhas: p.armadilhas.map((a) => ({ id: a.id, rotulo: a.rotulo, talhaoNome: a.talhao.nomeCodinome })),
      }))}
    />
  );
}
```

- [ ] **Step 4: Verify manually in the browser**

Run: `npm run build`, then in the preview go to `/monitoramento-pragas/nova`, pick the praga/safra used in Task 3-4's test data, confirm the armadilha shows in the grid, fill a quantity, save, and confirm it redirects to `/monitoramento-pragas?tipoPraga=...&safra=...` without error.

- [ ] **Step 5: Commit**

```bash
git add src/actions/pragas.ts src/components/pragas/grade-leituras-form.tsx "src/app/(app)/monitoramento-pragas/nova"
git commit -m "Adiciona grade de lançamento de leituras em lote"
```

---

### Task 6: Editar/excluir uma leitura individual + histórico no ponto

**Files:**
- Modify: `src/actions/pragas.ts` (append)
- Create: `src/components/pragas/leitura-form.tsx`
- Create: `src/components/pragas/excluir-leitura-form.tsx`
- Create: `src/app/(app)/monitoramento-pragas/leituras/[id]/editar/page.tsx`
- Modify: `src/app/(app)/monitoramento-pragas/pontos/[id]/page.tsx` (add leitura history table)

**Interfaces:**
- Consumes: `garantirLeituraDaPropriedade` (Task 1).
- Produces: `atualizarLeituraArmadilha`, `excluirLeituraArmadilha`.

- [ ] **Step 1: Append the single-leitura actions**

Add `garantirLeituraDaPropriedade` to the `@/lib/propriedade` import in `src/actions/pragas.ts`, then append:

```ts
// --- Leitura individual (edição/exclusão) -----------------------------------

export async function atualizarLeituraArmadilha(
  leituraId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dataStr = String(formData.get("data") ?? "");
  const quantidadeRaw = formData.get("quantidade");

  if (!dataStr || !quantidadeRaw || !Number.isFinite(Number(quantidadeRaw)) || Number(quantidadeRaw) < 0) {
    return "Informe a data e uma quantidade válida (número inteiro não negativo).";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirLeituraDaPropriedade(leituraId, propriedadeId))) return "Leitura inválida.";

  const leitura = await db.leituraArmadilha.update({
    where: { id: leituraId },
    data: { data: new Date(dataStr), quantidade: Number(quantidadeRaw) },
    select: { armadilha: { select: { pontoMonitoramentoId: true } } },
  });

  revalidatePath(`/monitoramento-pragas/pontos/${leitura.armadilha.pontoMonitoramentoId}`);
  revalidatePath("/monitoramento-pragas");
  redirect(`/monitoramento-pragas/pontos/${leitura.armadilha.pontoMonitoramentoId}`);
}

export async function excluirLeituraArmadilha(leituraId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirLeituraDaPropriedade(leituraId, propriedadeId))) return;

  const leitura = await db.leituraArmadilha.delete({
    where: { id: leituraId },
    select: { armadilha: { select: { pontoMonitoramentoId: true } } },
  });

  revalidatePath(`/monitoramento-pragas/pontos/${leitura.armadilha.pontoMonitoramentoId}`);
  revalidatePath("/monitoramento-pragas");
  redirect(`/monitoramento-pragas/pontos/${leitura.armadilha.pontoMonitoramentoId}`);
}
```

(A `LeituraArmadilha` que já contribuiu para o histórico continua sendo um dado real — mas diferente de produto/talhão, aqui não há "outro registro" que dependa dela, então excluir é sempre permitido direto, sem soft-delete: é o mesmo raciocínio de "vínculo real e insubstituível" da skill de domínio, só que aqui não existe tal vínculo.)

- [ ] **Step 2: Build the form and delete components**

Create `src/components/pragas/leitura-form.tsx`:

```tsx
"use client";

import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type LeituraAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function LeituraForm({
  action,
  armadilhaRotulo,
  defaultValues,
}: {
  action: LeituraAction;
  armadilhaRotulo: string;
  defaultValues: { data: string; quantidade: string };
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">Armadilha: {armadilhaRotulo}</p>

      <div>
        <label htmlFor="data" className="mb-1 block text-sm font-medium text-neutral-700">
          Data *
        </label>
        <input
          id="data"
          name="data"
          type="date"
          required
          defaultValue={defaultValues.data}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div>
        <label htmlFor="quantidade" className="mb-1 block text-sm font-medium text-neutral-700">
          Quantidade capturada *
        </label>
        <input
          id="quantidade"
          name="quantidade"
          type="number"
          inputMode="numeric"
          min={0}
          step="1"
          required
          defaultValue={defaultValues.quantidade}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      {erro}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-green-700 py-3 text-base font-medium text-white active:bg-green-800 disabled:opacity-60"
      >
        {rotulo("Salvar alterações")}
      </button>
    </form>
  );
}
```

Create `src/components/pragas/excluir-leitura-form.tsx`:

```tsx
"use client";

import { excluirLeituraArmadilha } from "@/actions/pragas";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export function ExcluirLeituraForm({ leituraId }: { leituraId: string }) {
  return <ConfirmarExclusao action={excluirLeituraArmadilha.bind(null, leituraId)} />;
}
```

- [ ] **Step 3: Build the edit page**

Create `src/app/(app)/monitoramento-pragas/leituras/[id]/editar/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { LeituraForm } from "@/components/pragas/leitura-form";
import { ExcluirLeituraForm } from "@/components/pragas/excluir-leitura-form";
import { atualizarLeituraArmadilha } from "@/actions/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarLeituraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const leitura = await db.leituraArmadilha.findUnique({
    where: { id },
    include: { armadilha: { include: { pontoMonitoramento: true } } },
  });
  if (!leitura || leitura.armadilha.pontoMonitoramento.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <VoltarLink href={`/monitoramento-pragas/pontos/${leitura.armadilha.pontoMonitoramentoId}`} label="Voltar" />
        <ExcluirLeituraForm leituraId={leitura.id} />
      </div>

      <h1 className="text-xl font-semibold text-neutral-900">Editar leitura</h1>

      <LeituraForm
        action={atualizarLeituraArmadilha.bind(null, leitura.id)}
        armadilhaRotulo={leitura.armadilha.rotulo}
        defaultValues={{ data: leitura.data.toISOString().slice(0, 10), quantidade: leitura.quantidade.toString() }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Add the leitura history table to the ponto detail page**

In `src/app/(app)/monitoramento-pragas/pontos/[id]/page.tsx`, add the imports:

```ts
import { agruparMediaPorData, calcularSerieNivelControle, CORES_NIVEL } from "@/lib/pragas";
import { formatarData } from "@/lib/format";
```

Change the `db.pontoMonitoramento.findUnique` include to also pull leituras:

```ts
  const ponto = await db.pontoMonitoramento.findUnique({
    where: { id },
    include: {
      armadilhas: {
        orderBy: { rotulo: "asc" },
        include: { talhao: { select: { nomeCodinome: true } }, leituras: { orderBy: { data: "desc" } } },
      },
    },
  });
```

After the closing `</div>` of the "Armadilhas" card, add a new card computing and rendering the série using the pure functions from Task 2:

```tsx
      <PontoHistorico ponto={ponto} />
```

And add this helper component at the bottom of the same file, above the default export's closing (as a sibling function, same file):

```tsx
function PontoHistorico({
  ponto,
}: {
  ponto: {
    tipoPraga: import("@/generated/prisma/enums").TipoPraga;
    armadilhas: { leituras: { id: string; data: Date; quantidade: number }[] }[];
  };
}) {
  const leiturasBrutas = ponto.armadilhas.flatMap((a) =>
    a.leituras.map((l) => ({ data: l.data, quantidade: l.quantidade })),
  );
  const porData = agruparMediaPorData(leiturasBrutas);
  const serie = calcularSerieNivelControle(ponto.tipoPraga, porData);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-neutral-700">Histórico de leituras</p>
      {serie.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma leitura registrada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {[...serie].reverse().map((s) => (
            <li key={s.data.toISOString()} className="flex items-center justify-between text-sm">
              <span className="text-neutral-700">{formatarData(s.data)}</span>
              <span className="text-neutral-500">média {s.mediaAtual.toFixed(1)}</span>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${CORES_NIVEL[s.nivel].badge}`}>
                {CORES_NIVEL[s.nivel].texto}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify manually in the browser**

Run: `npm run build`, then in the preview, use `/monitoramento-pragas/nova` to log 2-3 readings on different dates for the same armadilha (reusing Task 3-5 test data), open the ponto's detail page and confirm the "Histórico de leituras" list shows the correct média/nível per date, edit one leitura's quantidade and confirm the recalculated nível updates, then delete a leitura.

- [ ] **Step 6: Commit**

```bash
git add src/actions/pragas.ts src/components/pragas/leitura-form.tsx src/components/pragas/excluir-leitura-form.tsx "src/app/(app)/monitoramento-pragas/leituras" "src/app/(app)/monitoramento-pragas/pontos/[id]/page.tsx"
git commit -m "Adiciona edição/exclusão de leitura e histórico no detalhe do ponto"
```

---

### Task 7: Página principal — status por ponto (sinalização visual)

**Files:**
- Create: `src/components/pragas/status-praga-badge.tsx`
- Create: `src/app/(app)/monitoramento-pragas/page.tsx`

**Interfaces:**
- Consumes: `TIPO_PRAGA_LABELS`, `CORES_NIVEL`, `statusAtualPonto` (Task 2).
- Produces: route `/monitoramento-pragas` (the module's home page, linked from nav in Task 8).

- [ ] **Step 1: Build the status badge component**

Create `src/components/pragas/status-praga-badge.tsx`:

```tsx
import { CORES_NIVEL, type NivelControle } from "@/lib/pragas";

export function StatusPragaBadge({ nivel }: { nivel: NivelControle }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${CORES_NIVEL[nivel].badge}`}>
      {CORES_NIVEL[nivel].texto}
    </span>
  );
}
```

- [ ] **Step 2: Build the main page**

Create `src/app/(app)/monitoramento-pragas/page.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS, statusAtualPonto } from "@/lib/pragas";
import { StatusPragaBadge } from "@/components/pragas/status-praga-badge";
import { formatarData } from "@/lib/format";
import { TipoPraga } from "@/generated/prisma/enums";
import { ehValorDoEnum } from "@/lib/enum";

export default async function MonitoramentoPragasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipoPraga?: string; safra?: string }>;
}) {
  const { tipoPraga, safra } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();
  const tipoPragaValido = tipoPraga && ehValorDoEnum(TipoPraga, tipoPraga) ? (tipoPraga as TipoPraga) : undefined;

  const pontos = await db.pontoMonitoramento.findMany({
    where: {
      propriedadeId,
      ...(tipoPragaValido ? { tipoPraga: tipoPragaValido } : {}),
      ...(safra ? { safra } : {}),
    },
    orderBy: [{ safra: "desc" }, { tipoPraga: "asc" }, { nome: "asc" }],
    include: { armadilhas: { where: { ativo: true }, include: { leituras: true } } },
  });

  const linhas = pontos.map((ponto) => {
    const leiturasBrutas = ponto.armadilhas.flatMap((a) => a.leituras.map((l) => ({ data: l.data, quantidade: l.quantidade })));
    return { ponto, status: statusAtualPonto(ponto.tipoPraga, leiturasBrutas) };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Monitoramento de Pragas</h1>
        <Link
          href="/monitoramento-pragas/nova"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova leitura
        </Link>
      </div>

      <div className="flex gap-2">
        <Link href="/monitoramento-pragas/pontos" className="text-sm font-medium text-green-700">
          Pontos de monitoramento
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/monitoramento-pragas/armadilhas" className="text-sm font-medium text-green-700">
          Armadilhas
        </Link>
      </div>

      {linhas.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum ponto de monitoramento cadastrado ainda.{" "}
          <Link href="/monitoramento-pragas/pontos/novo" className="font-medium text-green-700">
            Cadastrar o primeiro ponto
          </Link>
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {linhas.map(({ ponto, status }) => (
            <Link
              key={ponto.id}
              href={`/monitoramento-pragas/pontos/${ponto.id}`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{ponto.nome}</p>
                <p className="text-xs text-neutral-500">
                  {TIPO_PRAGA_LABELS[ponto.tipoPraga]} · safra {ponto.safra}
                  {status && ` · última leitura ${formatarData(status.data)}`}
                </p>
              </div>
              {status ? <StatusPragaBadge nivel={status.nivel} /> : <span className="text-xs text-neutral-400">Sem leitura</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify manually in the browser**

Run: `npm run build`, then navigate to `/monitoramento-pragas` and confirm the point created in earlier tasks shows with the correct colored badge matching the last quantidade entered (e.g. entering 25 for a Bonagota armadilha should show the red "Nível de controle" badge, per Task 2's threshold of ≥20).

- [ ] **Step 4: Commit**

```bash
git add src/components/pragas/status-praga-badge.tsx "src/app/(app)/monitoramento-pragas/page.tsx"
git commit -m "Adiciona página principal do Monitoramento de Pragas com status por ponto"
```

---

### Task 8: Nav item + painel de alertas na Home

**Files:**
- Modify: `src/lib/nav-items.ts`
- Modify: `src/lib/dashboard.ts`
- Modify: `src/app/(app)/page.tsx`

**Interfaces:**
- Consumes: `db`, `statusAtualPonto`, `TIPO_PRAGA_LABELS`, `CORES_NIVEL`.
- Produces: `buscarAlertasPragas(propriedadeId: string): Promise<AlertaPraga[]>` with `type AlertaPraga = { pontoId: string; pontoNome: string; tipoPraga: TipoPraga; data: Date }` (only entries whose `nivel === "CONTROLE"`).

- [ ] **Step 1: Add the nav item**

On `main`, `src/lib/nav-items.ts` predates a `lucide-react` icon migration that exists only on other, unmerged branches — `NavItem.icon` is typed `string` here and every entry is a plain emoji rendered directly by the 3 consumers (`side-nav.tsx`, `bottom-nav.tsx`, `mais/page.tsx`). Follow the file's actual current convention: add this entry to `SECONDARY_NAV_ITEMS` (after "Contagem de Frutos", to sit near the other field-monitoring modules) using an emoji, no new import:

```ts
  { href: "/monitoramento-pragas", label: "Monitoramento de Pragas", icon: "🐛" },
```

- [ ] **Step 2: Add `buscarAlertasPragas` to `src/lib/dashboard.ts`**

Add the import `statusAtualPonto, TIPO_PRAGA_LABELS` from `@/lib/pragas` and `TipoPraga` from `@/generated/prisma/enums`, then append at the end of the file:

```ts
export type AlertaPraga = {
  pontoId: string;
  pontoNome: string;
  talhoesNomes: string[];
  tipoPraga: TipoPraga;
  data: Date;
};

/** Pontos de monitoramento cuja leitura mais recente atingiu o nível de controle. */
export async function buscarAlertasPragas(propriedadeId: string): Promise<AlertaPraga[]> {
  const pontos = await db.pontoMonitoramento.findMany({
    where: { propriedadeId, ativo: true },
    include: {
      armadilhas: {
        where: { ativo: true },
        include: { leituras: true, talhao: { select: { nomeCodinome: true } } },
      },
    },
  });

  const alertas: AlertaPraga[] = [];
  for (const ponto of pontos) {
    const leiturasBrutas = ponto.armadilhas.flatMap((a) => a.leituras.map((l) => ({ data: l.data, quantidade: l.quantidade })));
    const status = statusAtualPonto(ponto.tipoPraga, leiturasBrutas);
    if (status?.nivel === "CONTROLE") {
      alertas.push({
        pontoId: ponto.id,
        pontoNome: ponto.nome,
        talhoesNomes: Array.from(new Set(ponto.armadilhas.map((a) => a.talhao.nomeCodinome))),
        tipoPraga: ponto.tipoPraga,
        data: status.data,
      });
    }
  }

  return alertas.sort((a, b) => b.data.getTime() - a.data.getTime());
}
```

- [ ] **Step 3: Render the alert card on the Home page**

In `src/app/(app)/page.tsx`, add the import:

```ts
import { buscarResumoPropriedade, buscarResumoBasicoPropriedades, buscarAlertasPragas } from "@/lib/dashboard";
import { TIPO_PRAGA_LABELS } from "@/lib/pragas";
```

(replacing the existing `buscarResumoPropriedade, buscarResumoBasicoPropriedades` import line with the extended one above).

In `ResumoDaPropriedade`, change the `Promise.all` to also fetch alerts:

```ts
  const [propriedade, resumo, clima, alertasPragas] = await Promise.all([
    db.propriedade.findUnique({ where: { id: propriedadeId }, select: { nome: true } }),
    buscarResumoPropriedade(propriedadeId),
    buscarClima(),
    buscarAlertasPragas(propriedadeId),
  ]);
```

Add the card right before the closing `</>` of `ResumoDaPropriedade`, after the "Área por cultura" card block and before the `{resumo.numeroMaquinas === 0 && ...}` block:

```tsx
      {alertasPragas.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-sm font-semibold text-red-800">
            🐛 Pragas em nível de controle ({alertasPragas.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {alertasPragas.map((a) => (
              <li key={a.pontoId}>
                <Link href={`/monitoramento-pragas/pontos/${a.pontoId}`} className="text-sm text-red-700 underline">
                  {TIPO_PRAGA_LABELS[a.tipoPraga]} — {a.pontoNome} ({a.talhoesNomes.join(", ")})
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
```

- [ ] **Step 4: Verify manually in the browser**

Run: `npm run build`, then open the Home page and confirm the "Monitoramento de Pragas" link appears in the side nav (desktop) / "Mais" menu (mobile), and that the red alert card shows for the point that has a reading at or above its threshold from earlier tasks (with a working link to the ponto's page). Then log a low reading and confirm the card disappears when no point is at CONTROLE level.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nav-items.ts src/lib/dashboard.ts "src/app/(app)/page.tsx"
git commit -m "Adiciona nav item e painel de alertas de pragas na Home"
```

---

### Task 9: Exportação CSV

**Files:**
- Create: `src/app/api/export/pragas/route.ts`

**Interfaces:**
- Consumes: `auth`, `propriedadeAtualId`, `respostaRelatorio` (`src/lib/export-response.ts`), `formatarData`.
- Produces: route `/api/export/pragas`, wired into the main page via `ExportarBotoes`.

- [ ] **Step 1: Implement the export route**

Create `src/app/api/export/pragas/route.ts`, matching `src/app/api/export/atividades/route.ts` exactly (auth check, `propriedadeAtualId`, `respostaRelatorio(formato, nomeArquivo, titulo, colunas, linhas)`):

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { respostaRelatorio } from "@/lib/export-response";
import { formatarData } from "@/lib/format";
import { propriedadeAtualId } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS } from "@/lib/pragas";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Não autenticado.", { status: 401 });

  const propriedadeId = await propriedadeAtualId();
  if (!propriedadeId) return new Response("Nenhuma propriedade selecionada.", { status: 400 });

  const formato = new URL(request.url).searchParams.get("formato");

  const leituras = await db.leituraArmadilha.findMany({
    where: { armadilha: { pontoMonitoramento: { propriedadeId } } },
    orderBy: { data: "desc" },
    include: {
      armadilha: {
        include: {
          talhao: { select: { nomeCodinome: true } },
          pontoMonitoramento: { select: { nome: true, tipoPraga: true, safra: true } },
        },
      },
    },
  });

  const linhas = leituras.map((l) => ({
    data: formatarData(l.data),
    praga: TIPO_PRAGA_LABELS[l.armadilha.pontoMonitoramento.tipoPraga],
    safra: l.armadilha.pontoMonitoramento.safra,
    ponto: l.armadilha.pontoMonitoramento.nome,
    armadilha: l.armadilha.rotulo,
    talhao: l.armadilha.talhao.nomeCodinome,
    quantidade: l.quantidade,
  }));

  return respostaRelatorio(
    formato,
    "monitoramento-pragas",
    "Monitoramento de Pragas",
    [
      { chave: "data", titulo: "Data" },
      { chave: "praga", titulo: "Praga", largura: 22 },
      { chave: "safra", titulo: "Safra" },
      { chave: "ponto", titulo: "Ponto", largura: 18 },
      { chave: "armadilha", titulo: "Armadilha", largura: 18 },
      { chave: "talhao", titulo: "Talhão", largura: 22 },
      { chave: "quantidade", titulo: "Quantidade" },
    ],
    linhas,
  );
}
```

- [ ] **Step 2: Add the export buttons to the main page**

In `src/app/(app)/monitoramento-pragas/page.tsx`, add the import `import { ExportarBotoes } from "@/components/relatorios/exportar-botoes";` and render `<ExportarBotoes recurso="pragas" />` next to the "+ Nova leitura" link in the header row (same layout as `src/app/(app)/atividades/page.tsx`).

- [ ] **Step 3: Verify manually**

Run: `npm run build`, then in the preview, open `/monitoramento-pragas` and click both "Excel" and "PDF" export buttons, confirming each downloads a file listing the leituras logged in earlier tasks.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/export/pragas" "src/app/(app)/monitoramento-pragas/page.tsx"
git commit -m "Adiciona exportação de Monitoramento de Pragas"
```

---

### Task 10: Migração do histórico da planilha

**Files:**
- Create: `scripts/importar-monitoramento-pragas.ts`

**Interfaces:**
- Consumes: `db`, the real file `Monitoramento_2026-2027.xlsx` (path passed as CLI arg), an xlsx-parsing library (`exceljs` is already a dependency — reuse it instead of adding a new one).

This task is exploratory/data-shaped rather than TDD — the correctness criterion is "does it reconstruct real armadilhas/leituras that match the spreadsheet", verified against actual cell counts, not a fixed expected-output test.

- [ ] **Step 1: Write the dry-run script**

Create `scripts/importar-monitoramento-pragas.ts`:

```ts
import ExcelJS from "exceljs";
import { db } from "@/lib/db";

const CAMINHO_PLANILHA = process.argv[2];
const MODO_GRAVAR = process.argv.includes("--gravar");

// Seções de praga por aba: linha 6 tem o nome da praga na primeira coluna
// mesclada do grupo; aqui mapeamos manualmente a partir da inspeção real da
// planilha (ver spec, seção 8) em vez de tentar inferir por heurística.
const SECOES_POR_ABA: Record<string, { coluna: number; tipoPraga: string }[]> = {
  "Pomo Sul": [
    { coluna: 2, tipoPraga: "GRAPHOLITA_MOLESTA" },
    { coluna: 35, tipoPraga: "MOSCA_DAS_FRUTAS" }, // Caroço
    { coluna: 53, tipoPraga: "MOSCA_DAS_FRUTAS" }, // Eva
    { coluna: 68, tipoPraga: "BONAGOTA" }, // Lagarta Enroladeira
    { coluna: 84, tipoPraga: "CYDIA" },
  ],
  Lapinha: [
    { coluna: 2, tipoPraga: "GRAPHOLITA_MOLESTA" },
    { coluna: 30, tipoPraga: "MOSCA_DAS_FRUTAS" },
    { coluna: 56, tipoPraga: "BONAGOTA" },
  ],
};

type ColunaArmadilha = { coluna: number; rotulo: string; talhaoNomeAproximado: string };

async function main() {
  if (!CAMINHO_PLANILHA) {
    console.error("Uso: tsx scripts/importar-monitoramento-pragas.ts <caminho.xlsx> [--gravar]");
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(CAMINHO_PLANILHA);

  for (const [nomeAba, secoes] of Object.entries(SECOES_POR_ABA)) {
    const sheet = workbook.getWorksheet(nomeAba);
    if (!sheet) {
      console.warn(`Aba "${nomeAba}" não encontrada — pulando.`);
      continue;
    }

    const propriedade = await db.propriedade.findUnique({ where: { nome: nomeAba } });
    if (!propriedade) {
      console.warn(`Propriedade "${nomeAba}" não cadastrada no sistema — pulando aba.`);
      continue;
    }

    const talhoes = await db.talhao.findMany({ where: { propriedadeId: propriedade.id } });

    for (const secao of secoes) {
      const colunasArmadilha = lerColunasDeArmadilha(sheet, secao.coluna);
      console.log(`\n[${nomeAba}] ${secao.tipoPraga} — ${colunasArmadilha.length} colunas de armadilha na seção`);

      for (const colArm of colunasArmadilha) {
        const talhao = casarTalhaoPorNome(talhoes, colArm.talhaoNomeAproximado);
        if (!talhao) {
          console.warn(`  ⚠ Sem match de talhão para rótulo "${colArm.rotulo}" — pulando esta coluna.`);
          continue;
        }

        const leituras = lerLeituras(sheet, colArm.coluna);
        console.log(`  ${colArm.rotulo} → talhão "${talhao.nomeCodinome}" (${leituras.length} leituras)`);

        if (MODO_GRAVAR) {
          // TODO(execução): resolver/criar o PontoMonitoramento correto para esta coluna
          // (nome do grupo lido da coluna "Média" mais próxima) e criar a Armadilha e as
          // LeituraArmadilha via db.$transaction — implementado e testado na Step 2, contra
          // um banco de desenvolvimento, antes de rodar com --gravar num banco real.
        }
      }
    }
  }
}

function lerColunasDeArmadilha(sheet: ExcelJS.Worksheet, colunaInicioSecao: number): ColunaArmadilha[] {
  const linhaRotulos = sheet.getRow(7);
  const resultado: ColunaArmadilha[] = [];
  let coluna = colunaInicioSecao;
  while (true) {
    const valor = linhaRotulos.getCell(coluna).value;
    if (valor == null || String(valor).trim() === "") break;
    const texto = String(valor).trim();
    if (/^(Média|Soma)/i.test(texto)) {
      coluna += 1;
      continue; // colunas calculadas, não são armadilhas de verdade
    }
    resultado.push({ coluna, rotulo: texto, talhaoNomeAproximado: texto.replace(/^\d+[-\s]*/, "") });
    coluna += 1;
  }
  return resultado;
}

function lerLeituras(sheet: ExcelJS.Worksheet, coluna: number): { data: Date; quantidade: number }[] {
  const resultado: { data: Date; quantidade: number }[] = [];
  for (let linha = 8; linha <= sheet.rowCount; linha++) {
    const dataCelula = sheet.getRow(linha).getCell(1).value;
    const quantidadeCelula = sheet.getRow(linha).getCell(coluna).value;
    if (dataCelula instanceof Date && typeof quantidadeCelula === "number") {
      resultado.push({ data: dataCelula, quantidade: quantidadeCelula });
    }
  }
  return resultado;
}

function casarTalhaoPorNome(talhoes: { id: string; nomeCodinome: string }[], nomeAproximado: string) {
  const normalizado = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const alvo = normalizado(nomeAproximado);
  return talhoes.find((t) => normalizado(t.nomeCodinome).includes(alvo) || alvo.includes(normalizado(t.nomeCodinome)));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
```

- [ ] **Step 2: Run in dry-run mode and review the match report**

Run: `npx tsx scripts/importar-monitoramento-pragas.ts "/path/to/Monitoramento_2026-2027.xlsx"`

Expected: a console report per aba/seção listing every armadilha column, its matched talhão, and its reading count — with **no database writes** (no `--gravar` flag). Read through the "⚠ Sem match de talhão" warnings; for each one, either add a manual alias to `casarTalhaoPorNome` or note it for the user to resolve by hand — do not guess silently.

- [ ] **Step 3: Implement the write path once the dry-run report looks correct**

Replace the `TODO(execução)` block with the real write, reusing `db.pontoMonitoramento.upsert` (same unique key as Task 3's `criarPontoMonitoramento`) keyed on `{ propriedadeId, tipoPraga: secao.tipoPraga, nome: <nome do grupo lido da coluna "Média"al>, safra }` (safra taken from the sheet's title row 1, e.g. parsed out of `"SAFRA 2026/2027"`), then `db.armadilha.upsert` per column keyed on `{ pontoMonitoramentoId, talhaoId, rotulo }` (no natural unique constraint exists for this — use `findFirst` + `create` instead of `upsert`), then `db.leituraArmadilha.createMany` for that armadilha's readings, wrapped together in one `db.$transaction` per aba so a partial failure doesn't leave half an aba imported.

- [ ] **Step 4: Run for real against the dev database**

Run: `npx tsx scripts/importar-monitoramento-pragas.ts "/path/to/Monitoramento_2026-2027.xlsx" --gravar`

Expected: exit 0. Then verify counts match: query `db.leituraArmadilha.count()` and compare against the dry-run report's total reading count from Step 2 — they must be equal. Spot-check 2-3 known values from the spreadsheet (e.g. the "SEDE" Grapholita point used as the Task 2 test fixture: 25.33 on 2026-08-11) against what the app now shows on `/monitoramento-pragas/pontos/<id>`.

- [ ] **Step 5: Commit**

```bash
git add scripts/importar-monitoramento-pragas.ts
git commit -m "Adiciona script de migração do histórico da planilha de monitoramento"
```

---

## Self-Review Notes

- **Spec coverage:** §1 (contexto) → plan intro; §2 (modelo de dados) → Task 1; §3 (regra do nível de controle) → Task 2; §4 (lançamento em grade) → Task 5; §5 (sinalização) → Tasks 6-8; §6 (cadastro) → Tasks 3-4; §7 (rotas/nav) → Tasks 3-9, 8; §8 (migração) → Task 10; §9 (testes) → Task 2 (automated) + manual browser verification in every other task's last step.
- **Type consistency checked:** `NivelControle`, `LeituraPontoResumo`, `ArmadilhaLeituraBruta`, and the `TipoPraga` enum values are spelled identically everywhere they're referenced across Tasks 2, 6, 7, 8.
- **Placeholder scan:** Task 9 was rewritten against the real `src/lib/export-response.ts`/`respostaRelatorio` signature and `src/app/api/export/atividades/route.ts` pattern (both read in full) instead of a guessed helper — no open follow-up remains there.
