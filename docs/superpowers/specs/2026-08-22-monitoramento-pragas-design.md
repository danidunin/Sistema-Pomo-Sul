# Monitoramento de Pragas — Design

## 1. Contexto e objetivo

Hoje o monitoramento de pragas (Grapholita molesta, Moscas-das-frutas, Bonagota/Lagarta
Enroladeira e Cydia) é feito assim: duas vezes por semana as armadilhas com feromônio são
lidas em campo, a contagem vai a lápis pra um bloco, e no escritório as secretárias digitam
tudo numa planilha Excel (`Monitoramento_2026-2027.xlsx`, abas "Pomo Sul" e "Lapinha"), que
depois chega por e-mail para apreciação.

Esta funcionalidade traz esse processo para dentro do POMO SUL: cadastro de armadilhas por
talhão, lançamento das contagens, cálculo automático do nível de controle (igual às fórmulas
já usadas na planilha) e sinalização visual quando uma praga atinge o nível de controle —
sem inventar um processo novo, só tirando a planilha do meio.

Fora de escopo por enquanto: notificação por e-mail/WhatsApp, limiares configuráveis pela UI
(ficam fixos no código, com os valores da Embrapa/planilha), e mudança de armadilha de talhão
no meio da safra.

## 2. Modelo de dados

```
enum TipoPraga {
  GRAPHOLITA_MOLESTA
  MOSCA_DAS_FRUTAS
  BONAGOTA
  CYDIA
}

model PontoMonitoramento {
  id             String
  propriedade    Propriedade
  propriedadeId  String
  tipoPraga      TipoPraga
  nome           String        // ex: "SEDE", "Gala", "Firminha", "Caroço"
  safra          String        // ex: "2026/2027" — mesmo padrão de MetaSafra/ContagemFrutos
  ativo          Boolean

  armadilhas     Armadilha[]

  @@unique([propriedadeId, tipoPraga, nome, safra])
}

model Armadilha {
  id                    String
  pontoMonitoramento    PontoMonitoramento
  pontoMonitoramentoId  String
  talhao                Talhao
  talhaoId              String
  rotulo                String   // ex: "4-Kampai 11" — número da armadilha + talhão/variedade
  ativo                 Boolean
  createdAt             DateTime

  leituras              LeituraArmadilha[]
}

model LeituraArmadilha {
  id           String
  armadilha    Armadilha
  armadilhaId  String
  data         DateTime
  quantidade   Int
  createdAt    DateTime

  @@index([armadilhaId, data])
}
```

**Por que "Ponto de Monitoramento" entre Propriedade e Armadilha?** Na planilha atual, várias
armadilhas próximas (ex.: 3 armadilhas na "SEDE") são lidas individualmente, mas o nível de
controle é avaliado pela **média do ponto** — não por armadilha isolada. É assim que a
propriedade já opera hoje ("Pomo Sul e Lapinha já estão divididas exatamente como eu quero"),
então essa estrutura é preservada. Cada armadilha continua ligada ao seu talhão, para aparecer
no histórico do talhão.

Armadilhas são cadastradas uma vez por safra e ficam fixas (mesmo talhão, mesmo ponto, do
início ao fim); se saem de uso, são apenas desativadas — o histórico de leituras não se perde.

## 3. Regra do nível de controle

As fórmulas foram extraídas diretamente da planilha (não só dos prints da Embrapa). O cálculo
é sobre um **total móvel das últimas 2 leituras do ponto** (não uma semana de calendário fixa,
já que a leitura é sempre ~2x/semana mas em dias que variam):

- `mediaPonto(data)` = média das quantidades das armadilhas ativas do ponto naquela data.
- Para Grapholita molesta, Bonagota e Cydia:
  `somaSemana = mediaPonto(data atual) + mediaPonto(leitura anterior do mesmo ponto)`
- Para Moscas-das-frutas (MAD — Média de Moscas por Armadilha por Dia):
  `mad = (mediaPonto(data atual) + mediaPonto(leitura anterior)) / 7`

| Praga | Métrica | Baixo | Atenção | Nível de controle |
|---|---|---|---|---|
| Grapholita molesta | somaSemana | < 10 | 10–19 | **≥ 20** |
| Bonagota | somaSemana | < 10 | 10–19 | **≥ 20** |
| Cydia | somaSemana | < 10 | 10–19 | **≥ 20** |
| Moscas-das-frutas | mad | < 0,3 | 0,3–0,4 | **≥ 0,5** |

Grapholita foi ajustada para o valor oficial da Embrapa (20/semana) em vez do valor usado
hoje na planilha (30/semana) — decisão já confirmada com o usuário. Cydia usa o mesmo limiar
de Bonagota, replicando a formatação condicional já aplicada a ela na aba "Pomo Sul".

Esses limiares ficam centralizados em uma função pura (`src/lib/pragas.ts`), fáceis de achar
e ajustar no código caso mudem no futuro — sem tela de configuração por enquanto.

## 4. Lançamento das contagens

Tela em grade por data, espelhando o fluxo real de campo → escritório:

1. Usuário escolhe **propriedade + praga + data da leitura**.
2. Sistema mostra uma tabela com uma linha por armadilha ativa daquele ponto/praga/safra
   (agrupadas visualmente por Ponto de Monitoramento), campo de quantidade por armadilha.
3. Ao salvar, cria uma `LeituraArmadilha` por armadilha preenchida (permite deixar em branco
   armadilhas puladas naquele dia).
4. Médias por ponto, nível de controle e sinalização são recalculados automaticamente a
   partir das leituras — nada é digitado manualmente.

Edição/exclusão de uma leitura específica segue o padrão dos outros módulos (página de
edição por id, confirmação de exclusão).

## 5. Sinalização

- **Grade de lançamento e histórico do talhão**: cada ponto/linha ganha uma cor (verde /
  amarelo / vermelho) conforme a tabela de limiares, igual à formatação condicional de hoje.
- **Painel na Home**: card "Pragas em nível de controle" listando ponto + talhão + praga que
  atingiram o limiar na leitura mais recente, para não precisar caçar na tabela.
- Notificação por e-mail/WhatsApp fica fora do escopo desta fase.

## 6. Cadastro de Pontos e Armadilhas

Telas de administração simples, por safra:

- `/monitoramento-pragas/pontos` — CRUD de Pontos de Monitoramento (propriedade, praga, nome,
  safra).
- `/monitoramento-pragas/armadilhas` — CRUD de Armadilhas (ponto, talhão, rótulo), com opção
  de desativar.

## 7. Rotas e navegação

Novo item em `SECONDARY_NAV_ITEMS` (`src/lib/nav-items.ts`): "Monitoramento de Pragas" →
`/monitoramento-pragas`, seguindo o padrão dos módulos de escritório (Histórico do Pomar,
Contagem de Frutos, Diesel, Chuva).

```
src/app/(app)/monitoramento-pragas/
  page.tsx                       // lista de pontos + status atual (cor) por praga
  nova/page.tsx                  // grade de lançamento por data
  [id]/editar/page.tsx           // editar leitura específica
  pontos/page.tsx, pontos/novo/page.tsx, pontos/[id]/editar/page.tsx
  armadilhas/page.tsx, armadilhas/novo/page.tsx, armadilhas/[id]/editar/page.tsx

src/actions/pragas.ts            // server actions (padrão actions/*.ts existente)
src/lib/pragas.ts                // cálculo de médias, soma semanal/MAD e nível de controle
src/components/pragas/*.tsx      // formulários e grade de lançamento
src/app/api/export/pragas/route.ts // export CSV, padrão dos outros módulos
```

## 8. Migração do histórico

Script one-off (`scripts/importar-monitoramento-pragas.ts`, não faz parte do fluxo normal do
app) que:

1. Lê `Monitoramento_2026-2027.xlsx` com uma lib de parsing de xlsx.
2. Para cada aba (Pomo Sul, Lapinha) e cada seção de praga (linha 6, células mescladas),
   reconstrói os Pontos de Monitoramento a partir das colunas "Média" e suas armadilhas a
   partir das colunas de trap individual (linha 7), casando pelo nome do talhão já cadastrado.
3. Para cada linha de data (linha 8+), cria uma `LeituraArmadilha` por coluna de armadilha
   com valor preenchido.
4. Roda em modo dry-run primeiro (imprime o que seria criado) antes de gravar no banco.

Talhões que não derem match automático por nome (abreviações como "Fort/Reub", "Q14") serão
listados para conferência manual antes da importação final.

## 9. Testes

- Testes unitários da função de cálculo de nível de controle (`src/lib/pragas.ts`): média do
  ponto, soma de 2 leituras, MAD, e limites das 3 faixas por praga — casos de borda (exatamente
  no limiar, ponto sem leituras suficientes ainda, armadilha desativada no meio da safra).
- Teste manual do fluxo de lançamento em grade (preencher, salvar, conferir recalculo e cor).
- Validação da importação: contagem de leituras importadas por aba deve bater com o número de
  células preenchidas na planilha original.
