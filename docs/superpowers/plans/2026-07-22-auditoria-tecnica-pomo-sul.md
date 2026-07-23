# Auditoria Técnica Pomo Sul (22/07/2026) — Plano de Implementação

> **Execução:** inline, nesta mesma conversa, em grupos pequenos. Sem subagent-driven-development —
> o usuário já definiu o processo: cada grupo é implementado, verificado (`tsc` + `lint` + `build`,
> já que o projeto não tem suite de testes automatizados) e resumido (problema/solução/arquivos/riscos),
> e só avança para o próximo grupo após confirmação explícita do usuário.

**Fonte:** `auditoria-pomo-sul-2026-07-22.pdf` (achados Crítica → Alta → Média → Baixa).

**Objetivo:** fechar os furos de confirmação de exclusão e checagem de propriedade (cross-tenant),
corrigir os achados de Alta prioridade, e então avaliar Média/Baixa — sem alterar nenhuma lógica de
negócio que já funciona, sem introduzir abstrações novas além das que o próprio relatório recomenda
(helpers de propriedade, componente de confirmação genérico).

## Global Constraints

- Preservar 100% do comportamento atual dos fluxos que já funcionam (tratamentos, atividades, estoque, etc).
- Reutilizar padrões já existentes no código (ex: `excluir-produto-form.tsx`, `atualizarOperacao` em
  `operacoes.ts`) em vez de inventar um novo.
- Nunca `window.confirm()` para ações destrutivas — padrão é confirmação em 2 etapas inline.
- Toda action de update/delete que recebe um ID externo deve validar que o registro pertence à
  `propriedadeId` atual (via `exigirPropriedadeAtual()`).
- Sem suite de testes automatizada neste projeto — verificação por grupo = `npx tsc --noEmit`,
  `npm run lint`, e quando fizer sentido `npm run build`. Mudanças em fluxos de dado (estoque,
  exclusão) merecem também um teste manual guiado (não custa pedir para o usuário validar no navegador
  quando o risco é maior).

---

## Grupo 1 — Crítica (achados #1 e #2 do relatório)

**Arquivos:**
- Criar: `src/components/ui/confirmar-exclusao.tsx` (componente genérico, extraído do padrão de
  `excluir-produto-form.tsx`)
- Modificar: `src/components/estoque/excluir-produto-form.tsx`,
  `src/components/operacoes/excluir-tratamento-form.tsx` (usar o novo componente)
- Criar: `src/app/(app)/operadores/[id]/excluir-operador-form.tsx` (novo, usando o componente genérico)
- Modificar: `src/app/(app)/operadores/[id]/page.tsx` (trocar botão cru por esse form)
- Modificar: `src/lib/propriedade.ts` (adicionar helpers `garantirTalhaoDaPropriedade`,
  `garantirProdutoDaPropriedade`, `garantirOperadorDaPropriedade`, `garantirMaquinaDaPropriedade`,
  `garantirManutencaoDaPropriedade`, `garantirRevisaoDaPropriedade`, `garantirContagemFrutosDaPropriedade`,
  `garantirVisitaDaPropriedade`)
- Modificar: `src/actions/talhoes.ts` (`atualizarTalhao`)
- Modificar: `src/actions/estoque.ts` (`atualizarProduto`, `excluirProduto`, `alternarAtivoProduto`,
  `criarMovimentacaoEstoque`)
- Modificar: `src/actions/operadores.ts` (`atualizarOperador`, `excluirOperador`)
- Modificar: `src/actions/maquinas.ts` (`atualizarManutencao`, `excluirManutencao`, `atualizarRevisao`,
  `excluirRevisao`; e por consistência `criarManutencao`/`criarRevisao`, que têm a mesma classe de
  problema mas não foram citados explicitamente no relatório)
- Modificar: `src/actions/fotos.ts` (todas as 3 actions)
- Modificar: `src/actions/contagem-frutos.ts` (`excluirContagemFrutos`)

**Verificação:** `npx tsc --noEmit`, `npm run lint`. Teste manual: excluir um operador sem histórico,
tentar excluir um produto/talhão trocando a propriedade selecionada via cookie (deve falhar com
mensagem amigável, não 500).

---

## Grupo 2 — Alta, parte 1 (achados #3 e #4)

- #3: `src/actions/operadores.ts` (`excluirOperador`) — bloquear/inativar se o operador tiver
  `OperacaoAgricola` vinculada (mesmo critério de `excluirProduto`).
- #4: `src/actions/estoque.ts` (`criarMovimentacaoEstoque`) — mover a checagem de disponibilidade
  para dentro da transação usando `updateMany` condicional (`quantidadeDisponivel: { gte: quantidade }`).

**Verificação:** `npx tsc --noEmit`, `npm run lint`. Teste manual: excluir operador com tratamento
vinculado (deve inativar, não 500); tentar saída de estoque maior que o disponível.

---

## Grupo 3 — Alta, parte 2 (achados #6 e #7)

- #6: `src/components/historico/galeria-fotos-visita.tsx` — usar `ConfirmarExclusao` (ou uma variante
  compacta) antes de excluir foto + aumentar a área de toque do botão "✕".
- #7: `src/actions/atividades.ts` (`atualizarAtividade`, `excluirAtividade`) +
  `src/components/atividades/atividade-form.tsx` (parametrizar `action`/`defaultValues`/`submitLabel`,
  igual ao padrão de `OperadorForm`) + `src/app/(app)/atividades/[id]/editar/page.tsx` (novo) +
  `src/app/(app)/atividades/[id]/page.tsx` (botões Editar/Excluir).

**Verificação:** `npx tsc --noEmit`, `npm run lint`. Teste manual: editar e excluir uma atividade de teste.

---

## Grupo 4 — Alta, parte 3 (achados #8 e #9 — responsividade mobile)

- #8: `src/app/(app)/tratamentos/page.tsx:80` — `overflow-hidden` → `overflow-x-auto` no wrapper da tabela.
- #9: `src/app/(app)/estoque/page.tsx:25` — `flex-wrap` no container dos 3 botões do cabeçalho.

**Verificação:** `npx tsc --noEmit`, `npm run lint`. Teste manual: abrir as duas páginas em viewport
~375px (DevTools) e confirmar que nada corta/estoura.

---

## Grupo 5+ — Média e Baixa

A detalhar após confirmação dos grupos de Alta, seguindo a mesma cadência (grupos pequenos,
verificação, resumo, confirmação). Lista de referência (ver relatório completo):
consumo de estoque sem validar disponibilidade em tratamentos, casts de enum sem guarda, `Number()`
sem guarda de NaN, convenções de erro inconsistentes, atalho cadastrar operador/máquina durante
tratamento, botões pequenos no histórico de máquina, inputs de Relatórios fora do padrão, `NovoUsuarioForm`
sem `<label>`, fallback offline no service worker, consolidação dos componentes de confirmação e do
boilerplate de `useActionState` (Baixa: `VoltarLink` duplicado, cores hex no `PainelClima`, `alt=""` em
fotos de conteúdo, hook compartilhado `FotoInput`/`MultiFotoInput`, estado de pending em formulários de
ação única, paginação do histórico de talhão, middleware de `/contagem-frutos` e `/relatorios`).
