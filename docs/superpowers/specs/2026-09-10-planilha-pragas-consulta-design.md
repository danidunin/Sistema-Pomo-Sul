# Planilha de Monitoramento de Pragas — Consulta Visual

## 1. Contexto e objetivo

O módulo Monitoramento de Pragas hoje depende de cadastro manual de Pontos de Monitoramento
e Armadilhas para gerar a grade com nível de controle calculado. Na prática, o produtor
decidiu **não** manter esse cadastro em dia — a planilha Excel que a propriedade já usa
(atualizada pelas secretárias, com a formatação condicional que já indica visualmente o
nível de controle) continua sendo a fonte real do dia a dia.

Esta funcionalidade dá um lugar pra essa planilha dentro do app: enviar o arquivo `.xlsx`
mais recente e visualizá-lo — com as mesmas cores que já aparecem no Excel — direto do
celular ou computador, sem precisar abrir o Excel ou pedir o arquivo por e-mail.

**Não é** uma segunda forma de importar dados: nenhum Ponto, Armadilha ou Leitura é criado a
partir do arquivo enviado. É puramente uma tela de consulta, somente leitura. O cadastro
manual de Pontos/Armadilhas (Tasks 3-9 do plano original) continua existindo no app,
independente desta funcionalidade — as duas coexistem sem se misturar.

## 2. Modelo de dados

Um único registro global (não por propriedade, já que o arquivo real tem as duas
propriedades como abas do mesmo workbook), sempre substituído no upload seguinte:

```prisma
model PlanilhaMonitoramento {
  id           String   @id @default("atual")
  url          String
  nomeArquivo  String
  tamanhoBytes Int
  enviadoPorId String?
  enviadoPor   Usuario? @relation(fields: [enviadoPorId], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("planilha_monitoramento")
}
```

`id` fixo (`"atual"`) — o upload sempre faz `upsert` nesse único registro, garantindo que só
existe uma planilha "atual" por design, sem precisar de lógica extra de limpeza. Sem
histórico de versões anteriores (decisão do produtor): o `url` antigo simplesmente deixa de
ser referenciado; o arquivo em si pode ficar órfão no armazenamento (aceitável — mesmo
padrão de custo/simplicidade de outros uploads do app).

## 3. Upload

- Página `/monitoramento-pragas/planilha`, com um botão "Enviar planilha" (formulário
  simples, sem preview antes de enviar).
- Aceita apenas `.xlsx` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`),
  limite de 20MB (mesmo teto já usado pelos outros uploads do app).
- Qualquer usuário autenticado pode enviar — mesma regra de permissão do resto do sistema
  (sem RBAC).
- Armazenamento segue exatamente o padrão já usado para fotos em `src/app/api/upload/route.ts`:
  Vercel Blob em produção (`@vercel/blob`, já é dependência do projeto), disco local em
  desenvolvimento. Uma nova pasta permitida (`"monitoramento-pragas"`) nesse mesmo endpoint,
  ou uma rota dedicada — decisão de implementação, não muda o comportamento.
- Ao concluir o upload, `upsert` do registro `PlanilhaMonitoramento` (id fixo) com a nova
  URL — a versão anterior para de ser referenciada.

## 4. Visualização

- A mesma página `/monitoramento-pragas/planilha` mostra, abaixo do botão de upload, a
  planilha atual (se houver uma enviada) — nada de tela separada para ver x para enviar.
- **Seletor de aba**: o arquivo real tem abas "Pomo Sul" e "Lapinha" (e pode ter uma aba
  vazia tipo "Plan3", que é ignorada — só entram abas com conteúdo real). A página lê as
  abas do workbook enviado e mostra um seletor simples (ex: abas/tabs no topo da tabela),
  abrindo a primeira aba com conteúdo por padrão.
- **Estrutura da tabela**: replica o layout real da planilha — cabeçalho de duas linhas
  (grupo/local na primeira, rótulo de cada armadilha/coluna calculada na segunda, com
  `colspan` reproduzindo as células mescladas do Excel), uma linha por data de leitura.
  Mesma ideia de tabela larga com rolagem horizontal e coluna de Data fixa que já existe na
  grade de Monitoramento de Pragas (`grade-excel.tsx`), mas aqui os dados vêm direto do
  arquivo, não do banco.
- **Cores**: o Excel já tem formatação condicional (regras `cellIs` com limiares numéricos
  por faixa de célula, mudando a cor do texto) configurada pela propriedade. A leitura do
  arquivo (via `exceljs`, já é dependência) extrai essas regras de cada aba e, ao renderizar
  cada célula numérica, resolve qual regra se aplica ao valor daquela célula e aplica a
  mesma cor — sem recalcular nada, só reproduzindo fielmente o que o Excel já mostra. Cores
  indexadas do Excel (paleta padrão de 56 cores) são traduzidas para hexadecimal via uma
  tabela fixa.
- Sem interação de edição: números, cabeçalhos e cores são só leitura.
- Se nenhuma planilha foi enviada ainda, mostra um estado vazio simples com o botão de
  upload em destaque.

## 5. Rotas e navegação

- Novo link "Planilha" em `/monitoramento-pragas` (a página principal), ao lado dos já
  existentes "Pontos de monitoramento" e "Armadilhas".
- Rota: `/monitoramento-pragas/planilha`.

## 6. Fora de escopo

- Nenhuma criação de Ponto/Armadilha/Leitura a partir do arquivo enviado.
- Nenhum alerta automático (Home) derivado dessa planilha.
- Sem histórico de versões — só a mais recente fica acessível.
- Sem edição da planilha pelo app.
- Sem suporte a outros formatos além de `.xlsx`.

## 7. Testes

- A função que resolve qual regra de formatação condicional se aplica a uma célula (dado o
  valor numérico e a lista de regras da faixa) é pura — mesmo padrão de `src/lib/pragas.ts`
  (o único módulo testado do projeto hoje): testada com os limiares reais já confirmados
  neste projeto (30/15 para Grapholita na planilha original, 20/10 para Bonagota/Cydia,
  0.5/0.3 para Moscas-das-frutas), incluindo casos de borda (valor exatamente no limiar).
- Resto da funcionalidade (upload, parsing do workbook, renderização) verificado ao vivo no
  navegador, com o arquivo real da propriedade — mesma convenção já usada no resto do app.
