# Planilha de Monitoramento de Pragas — Consulta Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user upload the real `.xlsx` monitoring spreadsheet and view it inside the app — read-only, reproducing the file's own conditional-formatting colors — without creating any `PontoMonitoramento`/`Armadilha`/`LeituraArmadilha` record from it.

**Architecture:** A single-row Prisma model tracks "the current file" (upserted on every upload, no version history). A pure module resolves Excel conditional-formatting rules to hex colors given a cell's row/column/value. A server-only parser (ExcelJS) turns an uploaded workbook into a plain data structure (grouped header + colored cells) that a React table component renders — completely decoupled from the existing Pontos/Armadilhas data model.

**Tech Stack:** Next.js App Router + Server Actions/Route Handlers, Prisma 7 + PostgreSQL, ExcelJS (already a dependency), `@vercel/blob` (already a dependency, same pattern as photo uploads), Vitest (already configured, scoped to `src/lib/*.ts` pure modules).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-10-planilha-pragas-consulta-design.md` — every task below implements a section of it.
- **This is a read-only viewer.** No task in this plan creates, updates, or deletes any `PontoMonitoramento`, `Armadilha`, or `LeituraArmadilha` row. Do not wire this feature into that data model in any way.
- Migrations are hand-written, additive-only SQL files under `prisma/migrations/<timestamp>_<name>/migration.sql` — never a generated destructive migration. New timestamp must sort after `20260823120000_leitura_unique_armadilha_data` (the current latest).
- Any user can upload — no RBAC in this app (every user has the same permissions).
- Upload storage follows the exact pattern already used for photos in `src/app/api/upload/route.ts`: `@vercel/blob`'s `put()` when `process.env.VERCEL` is set, local disk (`public/uploads/<pasta>`) otherwise.
- This codebase has automated tests only for pure, dependency-free logic (the existing convention: `src/lib/pragas.ts`/`pragas.test.ts`). Everything else (routes, pages, ExcelJS parsing) is verified live in the browser — do not add tests for those.
- Dates from spreadsheet cells are real `Date` objects once read by ExcelJS (not strings) — format with `formatarData` (`src/lib/format.ts`, UTC-safe) wherever displayed, matching the rest of the app.

---

## File Structure

```
prisma/schema.prisma                                        # + PlanilhaMonitoramento model, Usuario inverse relation
prisma/migrations/20260910120000_planilha_monitoramento/     # (Task 1)

src/lib/planilha-pragas.ts                                    # pure: indexed-color palette, conditional-formatting rule matching (Task 2)
src/lib/planilha-pragas.test.ts                                # Vitest, real values from the actual spreadsheet (Task 2)

src/app/api/upload/planilha-pragas/route.ts                    # upload + store + upsert PlanilhaMonitoramento (Task 3)

src/lib/planilha-pragas-parser.ts                              # server-only: ExcelJS workbook -> AbaTabela[] (Task 4)

src/components/pragas/planilha-upload-form.tsx                 # client: file input + upload (Task 5)
src/components/pragas/planilha-tabela.tsx                      # renders one AbaTabela as a colored table (Task 5)
src/app/(app)/monitoramento-pragas/planilha/page.tsx            # fetch record, fetch+parse blob, tab selector, upload form (Task 5)

src/lib/nav-items.ts                                            # no change — link lives inside /monitoramento-pragas, not the nav
src/app/(app)/monitoramento-pragas/page.tsx                     # + "Planilha" link next to the existing two (Task 5)
```

---

### Task 1: Schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260910120000_planilha_monitoramento/migration.sql`

**Interfaces:**
- Produces: Prisma model `PlanilhaMonitoramento` with fields `id` (fixed string `"atual"`), `url`, `nomeArquivo`, `tamanhoBytes`, `enviadoPorId` (nullable FK to `Usuario`), `createdAt`, `updatedAt`.

- [ ] **Step 1: Add the model to the schema**

In `prisma/schema.prisma`, add near the end of the file (after the `VisitaCampo`/pest-monitoring/diesel/chuva sections, wherever the file currently ends):

```prisma
// ---------------------------------------------------------------------------
// Planilha de Monitoramento de Pragas — consulta visual read-only do .xlsx
// que a propriedade já usa. Registro único (id fixo "atual"), sempre
// substituído no próximo upload — sem histórico de versões, e sem nenhum
// vínculo com PontoMonitoramento/Armadilha/LeituraArmadilha.
// ---------------------------------------------------------------------------

model PlanilhaMonitoramento {
  id           String   @id @default("atual")
  url          String
  nomeArquivo  String   @map("nome_arquivo")
  tamanhoBytes Int      @map("tamanho_bytes")
  enviadoPor   Usuario? @relation(fields: [enviadoPorId], references: [id])
  enviadoPorId String?  @map("enviado_por_id")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("planilha_monitoramento")
}
```

Add the inverse relation to `model Usuario` (currently only has `operacoesResponsavel`):

```prisma
  planilhasEnviadas PlanilhaMonitoramento[]
```

- [ ] **Step 2: Write the migration SQL by hand**

Create `prisma/migrations/20260910120000_planilha_monitoramento/migration.sql`:

```sql
-- Consulta visual da planilha de Monitoramento de Pragas — registro único
-- (id fixo "atual"), sem vínculo com pontos_monitoramento/armadilhas.

CREATE TABLE "planilha_monitoramento" (
    "id" TEXT NOT NULL DEFAULT 'atual',
    "url" TEXT NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "enviado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planilha_monitoramento_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "planilha_monitoramento" ADD CONSTRAINT "planilha_monitoramento_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 3: Apply the migration and regenerate the client**

Run:
```bash
npx prisma migrate deploy
npx prisma generate
```
Expected: both exit 0; `src/generated/prisma/models/PlanilhaMonitoramento.ts` is created.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260910120000_planilha_monitoramento
git commit -m "Adiciona schema da consulta visual da planilha de Monitoramento de Pragas"
```

---

### Task 2: `src/lib/planilha-pragas.ts` — resolução pura de cor por regra condicional (com testes)

**Files:**
- Create: `src/lib/planilha-pragas.ts`
- Create: `src/lib/planilha-pragas.test.ts`

**Interfaces:**
- Produces (used by Task 4): `corIndexadaParaHex(indexado: number | undefined): string | null`, `type OperadorRegra`, `type RegraFormatacao = { ref: string; operador: OperadorRegra; valores: number[]; corHex: string | null }`, `colunaParaNumero(letras: string): number`, `celulaEstaNoIntervalo(ref: string, linha: number, coluna: number): boolean`, `resolverCorCelula(regras: RegraFormatacao[], linha: number, coluna: number, valor: number): string | null`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/planilha-pragas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  corIndexadaParaHex,
  colunaParaNumero,
  celulaEstaNoIntervalo,
  resolverCorCelula,
  type RegraFormatacao,
} from "@/lib/planilha-pragas";

describe("corIndexadaParaHex", () => {
  it("resolve as cores da paleta padrão do Excel usadas na planilha real", () => {
    // Confirmadas lendo o arquivo real com ExcelJS: index 8 = preto (nível baixo),
    // index 10 = vermelho (nível de controle), index 12/18 = azul (atenção).
    expect(corIndexadaParaHex(8)).toBe("#000000");
    expect(corIndexadaParaHex(10)).toBe("#FF0000");
    expect(corIndexadaParaHex(12)).toBe("#0000FF");
    expect(corIndexadaParaHex(18)).toBe("#000080");
  });

  it("retorna null para um índice fora da paleta ou undefined", () => {
    expect(corIndexadaParaHex(999)).toBeNull();
    expect(corIndexadaParaHex(undefined)).toBeNull();
  });
});

describe("colunaParaNumero", () => {
  it("converte letras de coluna do Excel pro número da coluna (A=1)", () => {
    expect(colunaParaNumero("A")).toBe(1);
    expect(colunaParaNumero("B")).toBe(2);
    expect(colunaParaNumero("Z")).toBe(26);
    expect(colunaParaNumero("AA")).toBe(27);
    expect(colunaParaNumero("AH")).toBe(34);
    expect(colunaParaNumero("CV")).toBe(100);
  });
});

describe("celulaEstaNoIntervalo", () => {
  it("reconhece uma célula dentro de um único intervalo", () => {
    expect(celulaEstaNoIntervalo("B6:B89", 10, 2)).toBe(true);
    expect(celulaEstaNoIntervalo("B6:B89", 5, 2)).toBe(false);
    expect(celulaEstaNoIntervalo("B6:B89", 10, 3)).toBe(false);
  });

  it("reconhece uma célula isolada (sem ':')", () => {
    expect(celulaEstaNoIntervalo("C20", 20, 3)).toBe(true);
    expect(celulaEstaNoIntervalo("C20", 21, 3)).toBe(false);
  });

  it("um ref real da planilha tem vários intervalos separados por espaço", () => {
    const ref = "B6:B89 D8:M89 O8:AH89 C9:C18";
    expect(celulaEstaNoIntervalo(ref, 10, 2)).toBe(true); // dentro de B6:B89
    expect(celulaEstaNoIntervalo(ref, 10, 5)).toBe(true); // dentro de D8:M89 (coluna 5 = E, dentro de D..M = 4..13)
    expect(celulaEstaNoIntervalo(ref, 15, 20)).toBe(true); // dentro de O8:AH89 (coluna 20 = T, dentro de O..AH = 15..34)
    expect(celulaEstaNoIntervalo(ref, 7, 3)).toBe(false); // linha 7 não está em nenhum dos intervalos
  });
});

// Regras e limiares confirmados lendo diretamente a planilha real (Pomo Sul,
// seção Grapholita molesta): maior que 30 = vermelho, entre 15 e 30 = azul,
// menor que 15 = sem cor (preto/padrão).
describe("resolverCorCelula", () => {
  const regrasGrapholita: RegraFormatacao[] = [
    { ref: "B6:B89 D8:M89 O8:AH89 C9:C18", operador: "greaterThan", valores: [30], corHex: "#FF0000" },
    { ref: "B6:B89 D8:M89 O8:AH89 C9:C18", operador: "between", valores: [15, 30], corHex: "#0000FF" },
    { ref: "B6:B89 D8:M89 O8:AH89 C9:C18", operador: "lessThan", valores: [15], corHex: "#000000" },
  ];

  it("aplica a primeira regra cuja condição bate com o valor", () => {
    expect(resolverCorCelula(regrasGrapholita, 10, 5, 35)).toBe("#FF0000"); // >30
    expect(resolverCorCelula(regrasGrapholita, 10, 5, 20)).toBe("#0000FF"); // entre 15 e 30
    expect(resolverCorCelula(regrasGrapholita, 10, 5, 5)).toBe("#000000"); // <15
  });

  it("nos limiares exatos: 30 não é 'greaterThan' (é o teto do between), 15 é o piso do between", () => {
    expect(resolverCorCelula(regrasGrapholita, 10, 5, 30)).toBe("#0000FF");
    expect(resolverCorCelula(regrasGrapholita, 10, 5, 15)).toBe("#0000FF");
  });

  it("retorna null se a célula não está em nenhum intervalo das regras", () => {
    expect(resolverCorCelula(regrasGrapholita, 999, 999, 50)).toBeNull();
  });

  it("regra MAD real (moscas-das-frutas): >=0.5 vermelho, 0.3-0.4 azul-marinho, <0.3 sem cor", () => {
    const regrasMad: RegraFormatacao[] = [
      { ref: "AI84:AI89", operador: "greaterThanOrEqual", valores: [0.5], corHex: "#FF0000" },
      { ref: "AI84:AI89", operador: "between", valores: [0.3, 0.4], corHex: "#000080" },
      { ref: "AI84:AI89", operador: "lessThan", valores: [0.3], corHex: "#000000" },
    ];
    expect(resolverCorCelula(regrasMad, 85, 35, 0.5)).toBe("#FF0000");
    expect(resolverCorCelula(regrasMad, 85, 35, 0.35)).toBe("#000080");
    expect(resolverCorCelula(regrasMad, 85, 35, 0.1)).toBe("#000000");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/planilha-pragas.test.ts`
Expected: FAIL — `Cannot find module '@/lib/planilha-pragas'`.

- [ ] **Step 3: Implement `src/lib/planilha-pragas.ts`**

```ts
// Paleta indexada padrão do Excel (ECMA-376/OOXML, tabela legada de 64 cores) —
// usada quando uma regra de formatação condicional referencia a cor por índice
// em vez de RGB direto. Fonte: tabela COLOR_INDEX do openpyxl (biblioteca de
// referência para leitura de .xlsx), conferida contra os índices reais
// encontrados na planilha desta propriedade (8, 10, 12, 18).
const PALETA_INDEXADA: Record<number, string> = {
  0: "#000000", 1: "#FFFFFF", 2: "#FF0000", 3: "#00FF00", 4: "#0000FF", 5: "#FFFF00",
  6: "#FF00FF", 7: "#00FFFF", 8: "#000000", 9: "#FFFFFF", 10: "#FF0000", 11: "#00FF00",
  12: "#0000FF", 13: "#FFFF00", 14: "#FF00FF", 15: "#00FFFF", 16: "#800000", 17: "#008000",
  18: "#000080", 19: "#808000", 20: "#800080", 21: "#008080", 22: "#C0C0C0", 23: "#808080",
  24: "#9999FF", 25: "#993366", 26: "#FFFFCC", 27: "#CCFFFF", 28: "#660066", 29: "#FF8080",
  30: "#0066CC", 31: "#CCCCFF", 32: "#000080", 33: "#FF00FF", 34: "#FFFF00", 35: "#00FFFF",
  36: "#800080", 37: "#800000", 38: "#008080", 39: "#0000FF", 40: "#00CCFF", 41: "#CCFFFF",
  42: "#CCFFCC", 43: "#FFFF99", 44: "#99CCFF", 45: "#FF99CC", 46: "#CC99FF", 47: "#FFCC99",
  48: "#3366FF", 49: "#33CCCC", 50: "#99CC00", 51: "#FFCC00", 52: "#FF9900", 53: "#FF6600",
  54: "#666699", 55: "#969696", 56: "#003366", 57: "#339966", 58: "#003300", 59: "#333300",
  60: "#993300", 61: "#993366", 62: "#333399", 63: "#333333",
};

export function corIndexadaParaHex(indexado: number | undefined): string | null {
  if (indexado === undefined) return null;
  return PALETA_INDEXADA[indexado] ?? null;
}

export type OperadorRegra = "greaterThan" | "greaterThanOrEqual" | "lessThan" | "lessThanOrEqual" | "between";

export type RegraFormatacao = {
  /** Um ou mais intervalos de célula separados por espaço, ex: "B6:B89 D8:M89" — é assim
   * que o Excel guarda uma regra aplicada a várias seleções não contíguas. */
  ref: string;
  operador: OperadorRegra;
  /** 1 valor para greaterThan/greaterThanOrEqual/lessThan/lessThanOrEqual, 2 para between. */
  valores: number[];
  corHex: string | null;
};

/** Converte uma referência de coluna estilo Excel ("B", "AH") pro número da coluna (A=1). */
export function colunaParaNumero(letras: string): number {
  let numero = 0;
  for (const letra of letras.toUpperCase()) {
    numero = numero * 26 + (letra.charCodeAt(0) - "A".charCodeAt(0) + 1);
  }
  return numero;
}

const REGEX_CELULA = /^([A-Z]+)(\d+)$/;

function celulaParaLinhaColuna(celula: string): { linha: number; coluna: number } | null {
  const m = REGEX_CELULA.exec(celula);
  if (!m) return null;
  return { linha: Number(m[2]), coluna: colunaParaNumero(m[1]) };
}

function intervaloContem(intervalo: string, linha: number, coluna: number): boolean {
  const [inicioStr, fimStr] = intervalo.split(":");
  const inicio = celulaParaLinhaColuna(inicioStr);
  const fim = fimStr ? celulaParaLinhaColuna(fimStr) : inicio;
  if (!inicio || !fim) return false;
  return linha >= inicio.linha && linha <= fim.linha && coluna >= inicio.coluna && coluna <= fim.coluna;
}

/** `ref` pode ter vários intervalos separados por espaço. */
export function celulaEstaNoIntervalo(ref: string, linha: number, coluna: number): boolean {
  return ref.split(" ").some((intervalo) => intervaloContem(intervalo, linha, coluna));
}

function regraSeAplica(regra: RegraFormatacao, valor: number): boolean {
  switch (regra.operador) {
    case "greaterThan":
      return valor > regra.valores[0];
    case "greaterThanOrEqual":
      return valor >= regra.valores[0];
    case "lessThan":
      return valor < regra.valores[0];
    case "lessThanOrEqual":
      return valor <= regra.valores[0];
    case "between":
      return valor >= regra.valores[0] && valor <= regra.valores[1];
  }
}

/**
 * Resolve a cor de uma célula: a primeira regra (na ordem em que aparecem — o Excel já as
 * guarda em ordem de prioridade) cujo intervalo contém a célula E cuja condição bate com o
 * valor. Retorna null se nenhuma regra se aplica (célula sem cor especial).
 */
export function resolverCorCelula(
  regras: RegraFormatacao[],
  linha: number,
  coluna: number,
  valor: number,
): string | null {
  for (const regra of regras) {
    if (celulaEstaNoIntervalo(regra.ref, linha, coluna) && regraSeAplica(regra, valor)) {
      return regra.corHex;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/planilha-pragas.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/planilha-pragas.ts src/lib/planilha-pragas.test.ts
git commit -m "Adiciona resolução pura de cor por regra condicional do Excel, com testes"
```

---

### Task 3: Rota de upload

**Files:**
- Create: `src/app/api/upload/planilha-pragas/route.ts`

**Interfaces:**
- Consumes: `auth` (`@/lib/auth`), `db` (`@/lib/db`).
- Produces: `POST /api/upload/planilha-pragas` — accepts `multipart/form-data` with a `file` field, returns `{ url: string }` on success.

- [ ] **Step 1: Read the existing photo-upload route for the storage pattern**

Read `src/app/api/upload/route.ts` in full before writing this task — it defines the exact `salvarArquivo` pattern (Vercel Blob in production, local disk in dev) this route must reuse. Do not invent a different storage mechanism.

- [ ] **Step 2: Implement the route**

Create `src/app/api/upload/planilha-pragas/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const TAMANHO_MAXIMO = 20 * 1024 * 1024;

async function salvarArquivo(bytes: Buffer, nomeArquivo: string): Promise<string> {
  if (process.env.VERCEL) {
    const blob = await put(`monitoramento-pragas/${nomeArquivo}`, bytes, {
      access: "public",
      contentType: TIPO_XLSX,
    });
    return blob.url;
  }

  const diretorio = path.join(process.cwd(), "public", "uploads", "monitoramento-pragas");
  await mkdir(diretorio, { recursive: true });
  await writeFile(path.join(diretorio, nomeArquivo), bytes);
  return `/api/uploads/monitoramento-pragas/${nomeArquivo}`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ erro: "Arquivo não enviado." }, { status: 400 });
  }
  const ehXlsx = file.type === TIPO_XLSX || file.name.toLowerCase().endsWith(".xlsx");
  if (!ehXlsx) {
    return NextResponse.json({ erro: "Envie um arquivo .xlsx." }, { status: 400 });
  }
  if (file.size > TAMANHO_MAXIMO) {
    return NextResponse.json({ erro: "Arquivo maior que 20MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const nomeArquivo = `${randomUUID()}.xlsx`;
  const url = await salvarArquivo(bytes, nomeArquivo);

  await db.planilhaMonitoramento.upsert({
    where: { id: "atual" },
    update: { url, nomeArquivo: file.name, tamanhoBytes: file.size, enviadoPorId: session.user.id },
    create: { id: "atual", url, nomeArquivo: file.name, tamanhoBytes: file.size, enviadoPorId: session.user.id },
  });

  return NextResponse.json({ url });
}
```

Note: the existing `src/app/api/uploads/[...path]/route.ts` (serves local-disk uploads back in dev) already handles any subfolder under `public/uploads/`, including this new `monitoramento-pragas` one — no change needed there. Confirm this by reading that file; if it hardcodes a list of allowed folders, add `"monitoramento-pragas"` to it.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` and `npx eslint src/app/api/upload/planilha-pragas/route.ts`
Expected: both clean.

- [ ] **Step 4: Manually verify in the browser**

Start the dev server, log in, and `curl` or use the browser's fetch console against `/api/upload/planilha-pragas` with a real `.xlsx` file (the actual `Monitoramento_2026-2027.xlsx` if available locally) — confirm a 200 response with a `url`, and confirm `db.planilhaMonitoramento.findUnique({ where: { id: "atual" } })` now returns a row with that URL. Re-upload a second file and confirm the row's `url` changed (not a second row).

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/upload/planilha-pragas"
git commit -m "Adiciona rota de upload da planilha de Monitoramento de Pragas"
```

---

### Task 4: Parser — workbook para estrutura de tabela

**Files:**
- Create: `src/lib/planilha-pragas-parser.ts`

**Interfaces:**
- Consumes: `resolverCorCelula`, `corIndexadaParaHex`, `type RegraFormatacao` (Task 2).
- Produces (used by Task 5): `type CelulaTabela = { valor: number | string | null; corHex: string | null }`, `type GrupoColuna = { rotulo: string; colSpan: number }`, `type AbaTabela = { nome: string; cabecalhoGrupo: GrupoColuna[]; cabecalhoColuna: string[]; linhas: { celulas: CelulaTabela[] }[] }`, `parsearWorkbook(workbook: ExcelJS.Workbook): AbaTabela[]`.

Este parser é server-only (`ExcelJS` lê um `Buffer`) e não tem teste automatizado — verificado ao vivo contra o arquivo real no navegador, mesma convenção do resto do app. A lógica de agrupamento por merge abaixo já foi testada manualmente contra a planilha real da propriedade (`Monitoramento_2026-2027.xlsx`) antes deste plano ser escrito, e reproduziu corretamente a estrutura real (ex: "Grapholita molesta" com colSpan 14, "SEDE"/"FIRMINHA"/"Pomo 1" com colSpan 2 cada, células vazias entre grupos preservadas como células de 1 coluna sem rótulo).

- [ ] **Step 1: Implement the parser**

Create `src/lib/planilha-pragas-parser.ts`:

```ts
import type ExcelJS from "exceljs";
import { resolverCorCelula, corIndexadaParaHex, type RegraFormatacao } from "@/lib/planilha-pragas";

export type CelulaTabela = { valor: number | string | null; corHex: string | null };
export type GrupoColuna = { rotulo: string; colSpan: number };
export type AbaTabela = {
  nome: string;
  cabecalhoGrupo: GrupoColuna[];
  cabecalhoColuna: string[];
  linhas: { celulas: CelulaTabela[] }[];
};

const LINHA_GRUPO = 6;
const LINHA_ROTULO = 7;
const LINHA_PRIMEIRA_LEITURA = 8;

function extrairRegras(planilha: ExcelJS.Worksheet): RegraFormatacao[] {
  const regras: RegraFormatacao[] = [];
  for (const cf of planilha.conditionalFormattings ?? []) {
    for (const regra of cf.rules ?? []) {
      if (regra.type !== "cellIs" || !regra.operator || !regra.formulae) continue;
      const estilo = regra.style as { font?: { color?: { indexed?: number; argb?: string } } } | undefined;
      const cor = estilo?.font?.color;
      // argb vem como "AARRGGBB" (8 caracteres) — os 2 primeiros são o canal alpha, descartado.
      const corHex = cor?.argb ? `#${cor.argb.slice(2)}` : corIndexadaParaHex(cor?.indexed);
      regras.push({
        ref: cf.ref ?? "",
        operador: regra.operator as RegraFormatacao["operador"],
        valores: (regra.formulae as string[]).map(Number),
        corHex,
      });
    }
  }
  return regras;
}

/** Agrupa uma linha de cabeçalho (com possíveis merges) em colunas de colSpan — usado tanto
 * para células mescladas (o grupo todo compartilha o mesmo texto do canto superior esquerdo)
 * quanto para células soltas (cada uma vira seu próprio grupo de 1 coluna, com seu próprio
 * texto, mesmo que vazio — preserva o alinhamento visual com as colunas de dado abaixo). */
function agruparLinhaHeader(
  planilha: ExcelJS.Worksheet,
  linha: number,
  colunaInicio: number,
  colunaFim: number,
): GrupoColuna[] {
  const grupos: GrupoColuna[] = [];
  let coluna = colunaInicio;
  while (coluna <= colunaFim) {
    const celula = planilha.getCell(linha, coluna);
    const master = celula.isMerged ? (celula as unknown as { master: ExcelJS.Cell }).master : celula;
    const enderecoGrupo = master.address;
    let fimGrupo = coluna;
    while (fimGrupo + 1 <= colunaFim) {
      const proxima = planilha.getCell(linha, fimGrupo + 1);
      const masterProxima = proxima.isMerged ? (proxima as unknown as { master: ExcelJS.Cell }).master : proxima;
      if (masterProxima.address !== enderecoGrupo) break;
      fimGrupo++;
    }
    grupos.push({ rotulo: String(master.value ?? ""), colSpan: fimGrupo - coluna + 1 });
    coluna = fimGrupo + 1;
  }
  return grupos;
}

/** Uma aba conta como conteúdo real se tiver pelo menos a linha de primeira leitura e mais
 * de uma coluna — descarta abas vazias tipo "Plan3". */
function temConteudo(planilha: ExcelJS.Worksheet): boolean {
  return planilha.rowCount >= LINHA_PRIMEIRA_LEITURA && planilha.actualColumnCount > 1;
}

export function parsearWorkbook(workbook: ExcelJS.Workbook): AbaTabela[] {
  const abas: AbaTabela[] = [];

  for (const planilha of workbook.worksheets) {
    if (!temConteudo(planilha)) continue;

    const regras = extrairRegras(planilha);
    const ultimaColuna = planilha.actualColumnCount;

    const cabecalhoColuna: string[] = [];
    for (let coluna = 2; coluna <= ultimaColuna; coluna++) {
      cabecalhoColuna.push(String(planilha.getCell(LINHA_ROTULO, coluna).value ?? ""));
    }

    const cabecalhoGrupo = agruparLinhaHeader(planilha, LINHA_GRUPO, 2, ultimaColuna);

    const linhas: { celulas: CelulaTabela[] }[] = [];
    for (let linha = LINHA_PRIMEIRA_LEITURA; linha <= planilha.rowCount; linha++) {
      const dataCelula = planilha.getCell(linha, 1).value;
      if (!(dataCelula instanceof Date)) continue;

      const celulas: CelulaTabela[] = [{ valor: dataCelula, corHex: null }];
      for (let coluna = 2; coluna <= ultimaColuna; coluna++) {
        const bruto = planilha.getCell(linha, coluna).value;
        const valor = typeof bruto === "number" ? bruto : null;
        celulas.push({
          valor,
          corHex: valor !== null ? resolverCorCelula(regras, linha, coluna, valor) : null,
        });
      }
      linhas.push({ celulas });
    }

    abas.push({ nome: planilha.name, cabecalhoGrupo, cabecalhoColuna, linhas });
  }

  return abas;
}
```

Note: `linhas[].celulas[0].valor` (a data) is typed as `number | string | null` in `CelulaTabela` but the parser stores a `Date` there — widen `CelulaTabela["valor"]` to `number | string | Date | null` if TypeScript complains at this exact spot (keep every other cell's `valor` as `number | null`, since only column 1 ever holds a date).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean (fix the `Date` typing note above if it isn't).

- [ ] **Step 3: Verify against the real file with a throwaway script**

Run (adjust the path to wherever the real spreadsheet is on this machine):

```bash
npx tsx -e '
import ExcelJS from "exceljs";
import { parsearWorkbook } from "./src/lib/planilha-pragas-parser";
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("/path/to/Monitoramento_2026-2027.xlsx");
  const abas = parsearWorkbook(wb);
  for (const aba of abas) {
    console.log(aba.nome, "grupos:", aba.cabecalhoGrupo.length, "colunas:", aba.cabecalhoColuna.length, "linhas:", aba.linhas.length);
  }
  console.log(JSON.stringify(abas[0].cabecalhoGrupo.slice(0, 5), null, 1));
})();
'
```

Expected: exactly the sheets with real content are listed (not `Plan3`), `cabecalhoGrupo` starts with `{ rotulo: "Grapholita molesta", colSpan: 14 }` for the "Pomo Sul" sheet, and `linhas.length` is in the range of real reading dates (dozens, not thousands — confirms the `dataCelula instanceof Date` filter is correctly skipping the thousands of blank formatted rows past the real data).

- [ ] **Step 4: Commit**

```bash
git add src/lib/planilha-pragas-parser.ts
git commit -m "Adiciona parser do workbook pra estrutura de tabela colorida"
```

---

### Task 5: Página de upload e visualização

**Files:**
- Create: `src/components/pragas/planilha-upload-form.tsx`
- Create: `src/components/pragas/planilha-tabela.tsx`
- Create: `src/app/(app)/monitoramento-pragas/planilha/page.tsx`
- Modify: `src/app/(app)/monitoramento-pragas/page.tsx`

**Interfaces:**
- Consumes: `AbaTabela`, `parsearWorkbook` (Task 4); `db.planilhaMonitoramento` (Task 1); `POST /api/upload/planilha-pragas` (Task 3); `formatarData` (`@/lib/format`); `VoltarLink` (`@/components/nav/voltar-link`).

- [ ] **Step 1: Build the upload form component**

Create `src/components/pragas/planilha-upload-form.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PlanilhaUploadForm() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setEnviando(true);
    setErro(null);

    try {
      const formData = new FormData();
      formData.append("file", arquivo);
      const res = await fetch("/api/upload/planilha-pragas", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Falha no envio.");
      router.refresh();
    } catch (err) {
      console.error("Falha ao enviar planilha:", err);
      setErro(err instanceof Error && err.message ? err.message : "Não foi possível enviar a planilha. Tente novamente.");
    } finally {
      setEnviando(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <label
        htmlFor="planilha-upload"
        className="inline-block cursor-pointer rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
      >
        {enviando ? "Enviando..." : "Enviar planilha"}
      </label>
      <input
        id="planilha-upload"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleChange}
        disabled={enviando}
        className="hidden"
      />
      {erro && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build the table component**

Create `src/components/pragas/planilha-tabela.tsx`:

```tsx
import { formatarData } from "@/lib/format";
import type { AbaTabela } from "@/lib/planilha-pragas-parser";

export function PlanilhaTabela({ aba }: { aba: AbaTabela }) {
  return (
    // min-w-0: este card é filho de um container flex (flex flex-col) na página — sem isso
    // a tabela larga empurra a PÁGINA INTEIRA além da viewport no mobile, quebrando o rodapé
    // fixo em outras telas do app (bug real já visto e corrigido na grade de Monitoramento
    // de Pragas — ver grade-excel.tsx).
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 z-10 border-b border-r border-neutral-200 bg-neutral-50 px-3 py-2 text-left align-bottom font-medium text-neutral-600"
              >
                Data
              </th>
              {aba.cabecalhoGrupo.map((grupo, i) => (
                <th
                  key={i}
                  colSpan={grupo.colSpan}
                  className="whitespace-nowrap border-b border-r border-neutral-200 bg-neutral-50 px-3 py-2 text-center font-medium text-neutral-700"
                >
                  {grupo.rotulo}
                </th>
              ))}
            </tr>
            <tr>
              {aba.cabecalhoColuna.map((rotulo, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap border-b border-neutral-200 px-2 py-1.5 text-center text-xs font-normal text-neutral-500"
                >
                  {rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {aba.linhas.map((linha, i) => (
              <tr key={i} className="border-b border-neutral-100 last:border-b-0">
                <td className="sticky left-0 z-10 whitespace-nowrap border-r border-neutral-200 bg-white px-3 py-1.5 text-neutral-700">
                  {linha.celulas[0].valor instanceof Date ? formatarData(linha.celulas[0].valor) : ""}
                </td>
                {linha.celulas.slice(1).map((celula, j) => (
                  <td
                    key={j}
                    className="px-2 py-1.5 text-center"
                    style={celula.corHex ? { color: celula.corHex, fontWeight: 600 } : undefined}
                  >
                    {celula.valor ?? <span className="text-neutral-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build the page**

Create `src/app/(app)/monitoramento-pragas/planilha/page.tsx`:

```tsx
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { formatarData } from "@/lib/format";
import { parsearWorkbook } from "@/lib/planilha-pragas-parser";
import { PlanilhaUploadForm } from "@/components/pragas/planilha-upload-form";
import { PlanilhaTabela } from "@/components/pragas/planilha-tabela";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function PlanilhaPragasPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba: abaSelecionada } = await searchParams;
  const planilha = await db.planilhaMonitoramento.findUnique({ where: { id: "atual" } });

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/monitoramento-pragas" label="Voltar" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Planilha</h1>
          {planilha && (
            <p className="text-xs text-neutral-500">
              {planilha.nomeArquivo} · enviada em {formatarData(planilha.updatedAt)}
            </p>
          )}
        </div>
        <PlanilhaUploadForm />
      </div>

      {!planilha ? (
        <p className="text-sm text-neutral-500">Nenhuma planilha enviada ainda.</p>
      ) : (
        <PlanilhaConteudo url={planilha.url} abaSelecionada={abaSelecionada} />
      )}
    </div>
  );
}

async function PlanilhaConteudo({ url, abaSelecionada }: { url: string; abaSelecionada?: string }) {
  const resposta = await fetch(url, { cache: "no-store" });
  if (!resposta.ok) {
    return <p className="text-sm text-red-600">Não foi possível carregar a planilha enviada. Tente enviar de novo.</p>;
  }

  const buffer = await resposta.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const abas = parsearWorkbook(workbook);

  if (abas.length === 0) {
    return <p className="text-sm text-neutral-500">A planilha enviada não tem nenhuma aba com dado reconhecível.</p>;
  }

  const aba = abas.find((a) => a.nome === abaSelecionada) ?? abas[0];

  return (
    <div className="flex flex-col gap-3">
      {abas.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {abas.map((a) => (
            <a
              key={a.nome}
              href={`?aba=${encodeURIComponent(a.nome)}`}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                a.nome === aba.nome
                  ? "border-green-700 bg-green-50 text-green-800"
                  : "border-neutral-300 text-neutral-700"
              }`}
            >
              {a.nome}
            </a>
          ))}
        </div>
      )}
      <PlanilhaTabela aba={aba} />
    </div>
  );
}
```

- [ ] **Step 4: Add the nav link on the module's main page**

In `src/app/(app)/monitoramento-pragas/page.tsx`, find the existing links block (`Pontos de monitoramento` · `Armadilhas`) and add a third link:

```tsx
        <span className="text-neutral-300">·</span>
        <Link href="/monitoramento-pragas/planilha" className="text-sm font-medium text-green-700">
          Planilha
        </Link>
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`, `npx eslint src`, `npx vitest run`, `npm run build`.
Expected: all clean, `/monitoramento-pragas/planilha` present in the build's route list.

- [ ] **Step 6: Manually verify in the browser**

Start the dev server, log in, go to `/monitoramento-pragas/planilha`. Confirm the empty state shows when no file has been uploaded yet. Upload the real `Monitoramento_2026-2027.xlsx`. Confirm: both "Pomo Sul" and "Lapinha" tabs appear (not "Plan3"), switching tabs updates the table, the header groups ("Grapholita molesta", "SEDE", "FIRMINHA", "Moscas-das-frutas-Caroço", etc.) line up with the right columns, numbers in the red/blue ranges show colored text matching what the same cells show when the file is opened in Excel, and the table scrolls horizontally within its own card without breaking the page's mobile layout (resize to a mobile viewport and check the bottom nav stays correctly positioned — this is exactly the regression class fixed in `grade-excel.tsx`, don't reintroduce it here).

- [ ] **Step 7: Commit**

```bash
git add src/components/pragas/planilha-upload-form.tsx src/components/pragas/planilha-tabela.tsx "src/app/(app)/monitoramento-pragas/planilha" "src/app/(app)/monitoramento-pragas/page.tsx"
git commit -m "Adiciona página de upload e visualização da planilha de Monitoramento de Pragas"
```

---

## Self-Review Notes

- **Spec coverage:** §1 (contexto) → plan intro; §2 (modelo de dados) → Task 1; §3 (upload) → Task 3; §4 (visualização, seletor de aba, estrutura, cores) → Tasks 4-5; §5 (rotas/navegação) → Task 5 Step 4; §6 (fora de escopo) → enforced by the Global Constraints line forbidding any write to the Pontos/Armadilhas/Leituras model; §7 (testes) → Task 2.
- **Type consistency checked:** `AbaTabela`, `GrupoColuna`, `CelulaTabela`, `RegraFormatacao`, `parsearWorkbook`, `resolverCorCelula` are spelled identically everywhere they're referenced across Tasks 2, 4, and 5.
- **Verified against the real spreadsheet before writing, not guessed:** the indexed-color palette (via `openpyxl.styles.colors.COLOR_INDEX`, cross-checked against the actual `font.color.indexed` values ExcelJS reads from the real file), the conditional-formatting rule shapes (`cellIs`/`greaterThan`/`between`/`lessThan` with real threshold values), and the merge-based header-grouping algorithm (`agruparLinhaHeader`, run against the real "Pomo Sul" sheet and confirmed to reproduce "Grapholita molesta" colSpan 14, "SEDE"/"FIRMINHA"/"Pomo 1" colSpan 2 each, with blank spacer columns preserved) were all run against `Monitoramento_2026-2027.xlsx` before this plan was written — not reconstructed from memory.
