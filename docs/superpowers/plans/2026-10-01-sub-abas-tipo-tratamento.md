# Sub-abas por tipo de operação em Tratamentos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dentro de uma quadra selecionada em `/tratamentos`, adicionar sub-abas (Adubação / Tratamentos / Herbicida / Outra) que filtram a lista de operações pelo campo `tipo`, já existente no banco.

**Architecture:** Duas camadas: (1) funções puras em `src/lib/operacoes.ts` que decidem quais sub-abas mostrar e validam o `tipo` vindo da query string, cobertas por testes unitários; (2) `src/app/(app)/tratamentos/page.tsx` (server component) passa a buscar as operações da quadra sem filtro de tipo (`operacoesBase`), usa as funções puras para decidir abas/seleção, e deriva a lista filtrada (`operacoes`) em memória — sem query adicional ao banco.

**Tech Stack:** Next.js (App Router, server components), Prisma, Vitest.

## Global Constraints

- Sub-abas de tipo só aparecem quando uma quadra específica está selecionada (`talhaoId` válido na URL); na aba "Todos" nada muda.
- Ordem fixa das abas: Todos, Adubação, Tratamentos, Herbicida, [Outra se houver dados].
- Navegação via query string (`?talhaoId=X&tipo=Y`), sem estado client-side — mesmo padrão das abas de quadra existentes.
- `tipo` inválido ou sem dados na quadra cai de volta para "Todos" (mesma lógica de fallback já usada para `talhaoId`).
- O acumulado de chuva (`calcularAcumuladoPorTratamento`) continua calculado sobre todas as operações `FITOSSANITARIO` da quadra, independente do filtro de tipo ativo.
- Nenhuma mudança em schema do Prisma, formulário de cadastro, ou na tela `/tratamentos/resumo`.

---

### Task 1: Funções puras de sub-abas em `src/lib/operacoes.ts`

**Files:**
- Modify: `src/lib/operacoes.ts`
- Test: `src/lib/operacoes.test.ts` (novo)

**Interfaces:**
- Consumes: nada (tipos vêm de `@/generated/prisma/enums`, já importado no arquivo)
- Produces:
  - `tiposParaAbas(tiposComDados: TipoOperacao[]): TipoOperacao[]`
  - `validarTipoSelecionado(tipoParam: string | undefined, tiposDisponiveis: TipoOperacao[]): TipoOperacao | null`
  - `TIPO_OPERACAO_LABELS_ABA: Record<TipoOperacao, string>`

- [ ] **Step 1: Escrever o arquivo de teste (vai falhar — funções ainda não existem)**

Criar `src/lib/operacoes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { tiposParaAbas, validarTipoSelecionado } from "@/lib/operacoes";

describe("tiposParaAbas", () => {
  it("sem OUTRA nos dados, retorna as três abas fixas, nessa ordem", () => {
    expect(tiposParaAbas(["ADUBACAO", "HERBICIDA"])).toEqual([
      "ADUBACAO",
      "FITOSSANITARIO",
      "HERBICIDA",
    ]);
  });

  it("sem nenhum dado, ainda retorna as três abas fixas", () => {
    expect(tiposParaAbas([])).toEqual(["ADUBACAO", "FITOSSANITARIO", "HERBICIDA"]);
  });

  it("com OUTRA nos dados, inclui Outra ao final", () => {
    expect(tiposParaAbas(["FITOSSANITARIO", "OUTRA"])).toEqual([
      "ADUBACAO",
      "FITOSSANITARIO",
      "HERBICIDA",
      "OUTRA",
    ]);
  });
});

describe("validarTipoSelecionado", () => {
  const abasComOutra = ["ADUBACAO", "FITOSSANITARIO", "HERBICIDA", "OUTRA"] as const;
  const abasSemOutra = ["ADUBACAO", "FITOSSANITARIO", "HERBICIDA"] as const;

  it("sem parâmetro, retorna null (Todos)", () => {
    expect(validarTipoSelecionado(undefined, [...abasComOutra])).toBeNull();
  });

  it("parâmetro válido e disponível, retorna o tipo", () => {
    expect(validarTipoSelecionado("HERBICIDA", [...abasComOutra])).toBe("HERBICIDA");
  });

  it("parâmetro que não é um TipoOperacao válido, retorna null", () => {
    expect(validarTipoSelecionado("QUALQUER_COISA", [...abasComOutra])).toBeNull();
  });

  it("parâmetro válido mas sem aba disponível para ele (ex: OUTRA sem dados), retorna null", () => {
    expect(validarTipoSelecionado("OUTRA", [...abasSemOutra])).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test -- src/lib/operacoes.test.ts`
Expected: FAIL — `tiposParaAbas` e `validarTipoSelecionado` não existem em `@/lib/operacoes`.

- [ ] **Step 3: Implementar as funções e o label de aba**

Em `src/lib/operacoes.ts`, adicionar (após `TIPO_OPERACAO_LABELS`):

```ts
export const TIPO_OPERACAO_LABELS_ABA: Record<TipoOperacao, string> = {
  FITOSSANITARIO: "Tratamentos",
  HERBICIDA: "Herbicida",
  ADUBACAO: "Adubação",
  OUTRA: "Outra",
};

const TIPOS_ABA_FIXOS: TipoOperacao[] = ["ADUBACAO", "FITOSSANITARIO", "HERBICIDA"];

/**
 * Sub-abas de tipo mostradas dentro de uma quadra: as três fixas sempre,
 * mais "Outra" só quando já existe algum registro desse tipo na quadra —
 * evita poluir a tela com uma aba vazia na maioria dos casos.
 */
export function tiposParaAbas(tiposComDados: TipoOperacao[]): TipoOperacao[] {
  return tiposComDados.includes("OUTRA") ? [...TIPOS_ABA_FIXOS, "OUTRA"] : TIPOS_ABA_FIXOS;
}

/**
 * Valida o `tipo` vindo da query string contra as abas realmente disponíveis
 * na quadra selecionada. Inválido ou indisponível cai para null ("Todos"),
 * mesma lógica de fallback já usada para `talhaoId` na página.
 */
export function validarTipoSelecionado(
  tipoParam: string | undefined,
  tiposDisponiveis: TipoOperacao[],
): TipoOperacao | null {
  if (!tipoParam) return null;
  return tiposDisponiveis.includes(tipoParam as TipoOperacao) ? (tipoParam as TipoOperacao) : null;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test -- src/lib/operacoes.test.ts`
Expected: PASS — 7 testes (3 de `tiposParaAbas` + 4 de `validarTipoSelecionado`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/operacoes.ts src/lib/operacoes.test.ts
git commit -m "feat: adiciona funções puras para sub-abas de tipo em Tratamentos"
```

---

### Task 2: Sub-abas na tela `/tratamentos`

**Files:**
- Modify: `src/app/(app)/tratamentos/page.tsx`

**Interfaces:**
- Consumes:
  - `tiposParaAbas(tiposComDados: TipoOperacao[]): TipoOperacao[]` (Task 1)
  - `validarTipoSelecionado(tipoParam: string | undefined, tiposDisponiveis: TipoOperacao[]): TipoOperacao | null` (Task 1)
  - `TIPO_OPERACAO_LABELS_ABA: Record<TipoOperacao, string>` (Task 1)
- Produces: nada consumido por outras tasks (é a última).

- [ ] **Step 1: Ler o `tipo` da query string e renomear a busca de operações para `operacoesBase`**

Em `src/app/(app)/tratamentos/page.tsx`, atualizar a assinatura e a busca:

```tsx
export default async function OperacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ talhaoId?: string; tipo?: string }>;
}) {
  const { talhaoId, tipo } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const talhoes = await db.talhao.findMany({
    where: { propriedadeId },
    orderBy: { nomeCodinome: "asc" },
    select: { id: true, nomeCodinome: true },
  });

  const talhaoSelecionado = talhaoId && talhoes.some((t) => t.id === talhaoId) ? talhaoId : null;

  const operacoesBase = await db.operacaoAgricola.findMany({
    where: talhaoSelecionado ? { talhaoId: talhaoSelecionado } : { talhao: { propriedadeId } },
    orderBy: [{ data: "desc" }, { createdAt: "asc" }],
    include: {
      talhao: true,
      produtos: { include: { produto: true } },
    },
  });

  const tiposComDados = talhaoSelecionado
    ? Array.from(new Set(operacoesBase.map((o) => o.tipo)))
    : [];
  const tiposAbas = talhaoSelecionado ? tiposParaAbas(tiposComDados) : [];
  const tipoSelecionado = talhaoSelecionado ? validarTipoSelecionado(tipo, tiposAbas) : null;

  const operacoes = tipoSelecionado
    ? operacoesBase.filter((o) => o.tipo === tipoSelecionado)
    : operacoesBase;
```

Isso substitui o bloco atual que ia de `const talhaoSelecionado = ...` até `const operacoes = await db.operacaoAgricola.findMany(...)`.

- [ ] **Step 2: Atualizar o cálculo de chuva acumulada para usar `operacoesBase`**

Trocar (mantendo o restante do bloco igual):

```tsx
  const chuvas = await buscarChuvaRegistros(propriedadeId);
  const fitossanitarios = operacoesBase
    .filter((o) => o.tipo === "FITOSSANITARIO")
    .map((o) => ({ id: o.id, talhaoId: o.talhaoId, data: o.data, createdAt: o.createdAt }));
```

(única mudança: `operacoes` → `operacoesBase`, para o acumulado continuar considerando todas as aplicações fitossanitárias da quadra, não só as do filtro de tipo ativo).

- [ ] **Step 3: Atualizar o import para incluir as novas funções**

```tsx
import { TIPO_OPERACAO_LABELS, TIPO_OPERACAO_LABELS_ABA, unidadeDosagemEfetiva, tiposParaAbas, validarTipoSelecionado } from "@/lib/operacoes";
```

- [ ] **Step 4: Renomear `AbaTalhao` para `Aba` (componente genérico, reusado pelas duas linhas de abas)**

No final do arquivo, renomear a função e seu uso:

```tsx
function Aba({ href, ativo, label }: { href: string; ativo: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium ${
        ativo
          ? "border-green-700 bg-green-700 text-white"
          : "border-neutral-300 bg-white text-neutral-700"
      }`}
    >
      {label}
    </Link>
  );
}
```

E atualizar a linha de abas de quadra existente, trocando `AbaTalhao` por `Aba`:

```tsx
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Aba href="/tratamentos" ativo={!talhaoSelecionado} label="Todos" />
        {talhoes.map((t) => (
          <Aba
            key={t.id}
            href={`/tratamentos?talhaoId=${t.id}`}
            ativo={talhaoSelecionado === t.id}
            label={t.nomeCodinome}
          />
        ))}
      </div>
```

- [ ] **Step 5: Adicionar a segunda linha de abas (sub-abas de tipo), só quando há quadra selecionada**

Imediatamente depois do bloco de abas de quadra (fechamento da `</div>` do Step 4) e antes do `{operacoes.length === 0 ? (...)`, adicionar:

```tsx
      {talhaoSelecionado && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Aba
            href={`/tratamentos?talhaoId=${talhaoSelecionado}`}
            ativo={!tipoSelecionado}
            label="Todos"
          />
          {tiposAbas.map((t) => (
            <Aba
              key={t}
              href={`/tratamentos?talhaoId=${talhaoSelecionado}&tipo=${t}`}
              ativo={tipoSelecionado === t}
              label={TIPO_OPERACAO_LABELS_ABA[t]}
            />
          ))}
        </div>
      )}
```

- [ ] **Step 6: Rodar lint e build para garantir que não há erro de tipo**

Run: `npm run lint`
Expected: sem erros novos no arquivo `src/app/(app)/tratamentos/page.tsx`.

Run: `npm test`
Expected: todos os testes continuam passando (incluindo os novos de `operacoes.test.ts`).

- [ ] **Step 7: Verificação manual no navegador**

Run: `npm run dev` e abrir `/tratamentos`.

Checklist (bater com a seção "Teste manual esperado" da spec em `docs/superpowers/specs/2026-10-01-sub-abas-tipo-tratamento-design.md`):
1. Na aba "Todos" (sem quadra): tela igual à atual, sem segunda linha de abas.
2. Selecionar uma quadra com operações de mais de um tipo: segunda linha de abas aparece (Todos, Adubação, Tratamentos, Herbicida, [Outra se houver]); "Todos" mostra tudo misturado, como antes.
3. Clicar em "Herbicida": lista mostra só operações desse tipo nessa quadra; numeração "Aplicação #N" reinicia considerando só essas.
4. Editar a URL manualmente para um `tipo` que não existe na quadra (ex: `&tipo=OUTRA` numa quadra sem nenhuma aplicação Outra): cai de volta para "Todos" dessa quadra.
5. Quadra sem nenhuma operação "Outra": aba "Outra" não aparece na lista de sub-abas.
6. Com um filtro de tipo ativo (ex: Adubação) numa quadra que tem aplicações fitossanitárias, o aviso de "🌧 Xmm acumulados" continua aparecendo corretamente nos itens fitossanitários — confirma que o acumulado não foi afetado pelo filtro.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(app\)/tratamentos/page.tsx
git commit -m "feat: adiciona sub-abas por tipo de operação dentro da quadra em Tratamentos"
```
