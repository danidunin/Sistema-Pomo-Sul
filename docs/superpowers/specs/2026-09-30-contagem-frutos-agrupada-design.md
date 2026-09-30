# Contagem de Frutos agrupada por quadra

## Problema

A tela `/contagem-frutos` hoje lista **todas** as contagens de **todas** as quadras numa
única lista plana, ordenada só por data. Com várias quadras registrando contagens nos mesmos
dias, a lista fica misturada e difícil de acompanhar — não dá pra ver de relance "como está
a quadra X" sem escanear a lista toda procurando as linhas daquela quadra.

## Visão geral

- **Tela principal** (`/contagem-frutos`): um card por **quadra + safra**, não mais uma
  linha por contagem individual.
- **Tela de detalhe da quadra** (nova rota): lista as contagens individuais daquela
  quadra+safra, no mesmo formato de linha usado hoje.
- Cálculo de estimativa de safra (`calcularEstimativaSafra`) não muda. O que muda é como os
  resultados são agregados e exibidos.

## Tela principal — `/contagem-frutos`

### Filtro

Um único dropdown de **safra** no topo (substitui o dropdown de quadra de hoje — agora a
navegação por quadra é via clique no card, não via filtro). Populado com os valores
distintos de `MetaSafra.safra` existentes na propriedade, mais recente primeiro (ordenação
por string funciona pois o formato é sempre `AAAA/AAAA`). Padrão: safra mais recente com
dados. O filtro de mês/ano de hoje (`PeriodoPicker`) sai desta tela e vai para a tela de
detalhe da quadra.

### Dados por card

Busca todas as `ContagemFrutos` da propriedade+safra selecionada com
`include: { talhao, metaSafra }`, depois agrupa em memória por `talhaoId` (uma única query,
sem N+1). Quadra sem nenhuma contagem na safra selecionada não aparece (não há o que
agrupar).

Para cada grupo (quadra+safra), o card mostra:

1. Nome da quadra (`talhao.nomeCodinome`) + badge da safra
2. **kg/ha estimado** — exatamente a mesma fórmula da "Média consolidada" que já existe na
   tela atual (`page.tsx:63-73`), só que calculada por grupo em vez de sobre a lista toda: a
   função `mediaPonderada` (hoje definida dentro do componente de página) pondera, pelo peso
   `numeroPlantasAmostradas` de cada contagem, três valores separadamente —
   `mediaFrutosPorPlanta`, `plantasPorHectare` e `pesoMedioFrutoG` — e o resultado é
   `mediaFrutosPorPlantaGrupo * plantasPorHectareMediaGrupo * pesoMedioFrutoGMediaGrupo / 1000`.
   `mediaPonderada` é movida de `page.tsx` para `src/lib/contagem-frutos.ts` para ser
   reaproveitada pela nova função de agrupamento.
3. Barra de progresso: média de frutos/planta do grupo vs. `metaFrutosPorPlanta` (da
   `MetaSafra` do grupo — todas as contagens do grupo compartilham a mesma `MetaSafra`, já
   que é única por talhão+safra).
4. **% de plantas amostradas** (novo): `soma(numeroPlantasAmostradas)` do grupo dividido por
   `talhao.numeroPlantas`, como barra + texto "`X% amostrado`" e legenda "`amostradas de
   total`". **Omitido inteiramente quando `talhao.numeroPlantas` é `null`** — hoje esse campo
   é opcional no cadastro de talhão (`src/components/talhoes/talhao-form.tsx:130-140`, sem
   `required`), então pode faltar. Cumulativo ao longo da safra: se a mesma quadra for
   amostrada em datas diferentes, os totais somam — não há controle de quais árvores
   específicas foram contadas em cada visita, então o percentual é uma aproximação de
   cobertura, não uma garantia de não-repetição.
5. Nº de contagens do grupo + data da mais recente (`data` máxima do grupo)

Ordenação dos cards: alfabética por `talhao.nomeCodinome` (mesma ordem do dropdown de
talhões usado em outras telas do app).

### Layout do card (referência visual aprovada)

Lista vertical de cards, um por quadra, dentro do mesmo container `rounded-xl border` usado
hoje. Cada card:

```
Eva 2020 – Quadra 16                              33.230 kg/ha
safra 2026/2027 · 3 contagens · última 19/09
[████████████████████░] média 175,0 de meta 180
[██░░░░░░░░░░░░░░░░░░░] 10% amostrado
180 de 1.800 plantas
```

Clicável (o card inteiro é um `<Link>`) para `/contagem-frutos/quadra/[talhaoId]?safra=...`.

## Tela de detalhe da quadra — `/contagem-frutos/quadra/[talhaoId]`

Rota nova: `src/app/(app)/contagem-frutos/quadra/[talhaoId]/page.tsx`.

**Por que safra vai em query string (`?safra=...`) e não no path:** valores de safra contêm
`/` (ex.: `"2026/2027"`), o que quebraria um segmento de rota Next.js. `?safra=2026%2F2027`
evita esse problema.

Conteúdo:

1. `VoltarLink` para `/contagem-frutos`.
2. Card-resumo no topo — mesmos dados e mesmo componente visual do card da tela principal
   (kg/ha, barra de meta, % amostrado, nº de contagens), para o `talhaoId`+`safra` da rota.
3. Filtro de mês/ano (`PeriodoPicker`, reaproveitado da tela atual) para navegar contagens de
   safras com muitos registros.
4. Lista das contagens individuais dessa quadra+safra, no formato de linha já usado hoje
   (data · média de X de meta Y · kg), cada uma um `<Link>` para
   `/contagem-frutos/[id]` (tela de edição existente, sem mudanças).
5. Botão "+ Nova contagem" apontando para
   `/contagem-frutos/nova?talhaoId=...` (já suportado pela rota existente) — falta adicionar
   o parâmetro de safra na pré-seleção do formulário, se o formulário atual não já inferir a
   safra mais recente daquele talhão automaticamente (conferir `contagem-form.tsx` ao
   implementar).

Se não houver `talhaoId` válido para a propriedade atual, ou nenhuma `MetaSafra` para essa
combinação talhão+safra, `notFound()` (mesmo padrão do `[id]/page.tsx` existente).

## Código a extrair/alterar

- **`src/lib/contagem-frutos.ts`**: nova função pura `agruparContagensPorQuadra`, recebendo
  a lista de contagens (com `talhao` e `metaSafra` incluídos) e devolvendo um array de grupos
  já com os totais agregados (soma de frutos, soma de plantas amostradas, contagem, data mais
  recente) — mantém a lógica de agregação testável e fora do componente de página, seguindo o
  padrão já usado por `calcularEstimativaSafra`.
- **`src/app/(app)/contagem-frutos/page.tsx`**: reescrita para buscar por safra, agrupar via
  `agruparContagensPorQuadra`, renderizar cards em vez de linhas.
- **Novo `src/app/(app)/contagem-frutos/quadra/[talhaoId]/page.tsx`**.
- **Possível componente compartilhado** `src/components/contagem-frutos/quadra-card.tsx`
  (o card-resumo é idêntico na tela principal e no topo da tela de detalhe — extrair evita
  duplicar o JSX/formatação).
- `src/app/(app)/contagem-frutos/[id]/page.tsx` e `nova/page.tsx`: sem mudanças de
  comportamento; podem ganhar um link de volta mais específico (`/contagem-frutos/quadra/...`
  em vez de `/contagem-frutos`) quando chegados a partir da tela de detalhe — decisão de
  implementação, não crítico para o design.

## Fora de escopo

- Não adiciona validação/obrigatoriedade ao campo `numeroPlantas` do cadastro de talhão.
- Não resolve o risco teórico de dupla contagem de árvores entre visitas amostrais
  diferentes (o percentual é uma aproximação de cobertura, não uma contagem exata de árvores
  únicas).
- Não muda a fórmula de `calcularEstimativaSafra` nem o formulário de criar/editar contagem.
- Não adiciona edição/exclusão em lote a partir da tela principal.
