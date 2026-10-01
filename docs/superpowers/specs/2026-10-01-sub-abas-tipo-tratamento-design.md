# Sub-abas por tipo de operação dentro da quadra (Tratamentos)

## Contexto

Em `/tratamentos`, a tela já tem uma linha de abas por quadra (`talhaoId` na query string): "Todos" + uma aba por talhão. Quando uma quadra está selecionada, a lista mostra todas as operações daquela quadra misturadas por data, com o tipo (`Tratamento fitossanitário` / `Herbicida` / `Adubação` / `Outra`) aparecendo só como texto dentro do título de cada card.

O campo `OperacaoAgricola.tipo` (enum `TipoOperacao`: `FITOSSANITARIO`, `HERBICIDA`, `ADUBACAO`, `OUTRA`) já existe e é preenchido no cadastro — não há mudança de schema ou de formulário.

## Objetivo

Dentro de uma quadra selecionada, permitir filtrar a lista por tipo de operação através de sub-abas, para facilitar a visualização (hoje fica tudo misturado).

## Comportamento

### Escopo das sub-abas
- As sub-abas só aparecem quando uma quadra específica está selecionada (`talhaoId` presente e válido na query string).
- Na aba "Todos" (sem `talhaoId`), nada muda — lista mista por data, como hoje.

### Abas exibidas
- "Todos" (padrão, sem `tipo` na URL) + "Adubação" + "Tratamentos" (= `FITOSSANITARIO`) + "Herbicida", sempre nessa ordem.
- "Outra" só aparece se existir pelo menos uma operação do tipo `OUTRA` naquela quadra (evita aba vazia na maioria dos casos).
- Rótulos usam o texto já existente em `TIPO_OPERACAO_LABELS`, exceto `FITOSSANITARIO` que usa "Tratamentos" nesta aba (mais curto que "Tratamento fitossanitário") em vez do label completo usado no card.

### Navegação
- Segue o mesmo padrão das abas de quadra: link com query string, sem estado client-side. A URL fica `?talhaoId=X&tipo=HERBICIDA` (tipo omitido = "Todos" dentro da quadra).
- `tipo` é validado contra o enum `TipoOperacao` do Prisma. As três abas fixas ("Adubação", "Tratamentos", "Herbicida") são sempre selecionáveis, mesmo sem nenhum registro desse tipo na quadra — nesse caso a lista mostra o estado vazio. Só "Outra" (a única aba condicional) cai de volta para "Todos" quando a quadra não tem nenhum registro `OUTRA`; um valor de `tipo` genuinamente inválido (fora do enum) também cai para "Todos", mesma lógica de validação já usada para `talhaoId`.

### Filtragem e layout da lista
- Com um `tipo` ativo, a filtragem acontece em memória sobre a lista já buscada para a quadra (`operacoesBase`), não como condição adicional na query ao banco — a lista completa continua sendo necessária para decidir se a aba "Outra" aparece e para o cálculo de chuva acumulada (ver abaixo).
- O agrupamento por data e a tabela de produtos dentro de cada card continuam exatamente como hoje — só a lista de entrada é menor.
- A numeração "Aplicação #N" dentro de cada dia passa a contar apenas as operações visíveis no filtro atual (ou seja, reinicia por tipo quando um filtro de tipo está ativo). Isso é consequência direta de filtrar antes de agrupar, sem lógica nova.
- O cálculo de chuva acumulada (`calcularAcumuladoPorTratamento`) continua sendo feito sobre todas as operações `FITOSSANITARIO` da quadra, independente do filtro de tipo ativo — é uma métrica de histórico, não da lista filtrada.

### Fora de escopo
- Tela de Resumo do ciclo (`/tratamentos/resumo`) — não muda.
- Formulário de novo/editar tratamento — não muda.
- Schema do Prisma — não muda.

## Teste manual esperado após implementação

1. Selecionar uma quadra com operações de mais de um tipo → sub-abas aparecem, "Todos" mostra tudo.
2. Clicar em "Herbicida" → lista mostra só operações desse tipo, nessa quadra.
3. Trocar de quadra mantendo o filtro de tipo na URL manualmente → se for uma das três abas fixas, permanece selecionada e mostra o estado vazio quando a nova quadra não tem registros desse tipo; se for "Outra" e a nova quadra não tiver nenhum registro `OUTRA` (ou o `tipo` for inválido), cai para "Todos" dessa quadra (mesmo comportamento de fallback do `talhaoId`).
4. Quadra sem nenhuma operação "Outra" → aba "Outra" não aparece.
5. Aba "Todos" (sem quadra) → tela idêntica à atual, sem sub-abas.
