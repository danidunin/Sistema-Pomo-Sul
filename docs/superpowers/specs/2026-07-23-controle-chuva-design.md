# Controle de Chuva — Design

Data: 2026-07-23
Branch: `feature/controle-chuva` (a partir de `feature/controle-diesel`)

## Objetivo

Registrar manualmente as leituras de pluviômetro (data + mm) e usar essa informação para
mostrar, de forma discreta, quanto choveu sobre cada tratamento fitossanitário desde sua
aplicação até o tratamento seguinte. Também adiciona um tipo de atividade "Chuva" em
Horas-Homem, para contabilizar horas pagas em dias parados por chuva.

## 1. Modelo de dados

### Nova tabela `ChuvaRegistro`

Uma leitura de pluviômetro. O pluviômetro é único por propriedade (não há leitura por talhão).

```
model ChuvaRegistro {
  id                    String   @id @default(cuid())
  propriedade           Propriedade @relation(fields: [propriedadeId], references: [id])
  propriedadeId         String   @map("propriedade_id")
  data                  DateTime
  quantidadeMm          Decimal  @map("quantidade_mm") @db.Decimal(6, 2)
  relacaoTratamentoDia  RelacaoTratamentoDia? @map("relacao_tratamento_dia")
  observacoes           String?
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@index([propriedadeId, data])
  @@map("chuva_registros")
}

enum RelacaoTratamentoDia {
  ANTES
  DEPOIS
}
```

`relacaoTratamentoDia` só é preenchido quando a data da leitura coincide com a data de algum
tratamento fitossanitário (em qualquer talhão da propriedade). Resolve o caso raro de chuva no
mesmo dia de uma aplicação: `ANTES` conta para a janela do tratamento que está fechando naquele
dia; `DEPOIS` conta para a janela do tratamento que está abrindo. Fora desse caso, o campo fica
nulo e não é perguntado no formulário.

### `Atividade.talhaoId` passa a ser opcional

Hoje é obrigatório (`talhaoId String`). Passa a `talhaoId String?` — a única atividade que pode
ficar sem talhão é "Chuva" (parada geral da equipe, sem vínculo com um talhão específico). A
obrigatoriedade para os demais tipos de atividade continua sendo validada na camada de
formulário/ação, não no banco.

### Novo tipo de atividade "Chuva"

Adicionado à lista `TIPOS_ATIVIDADE` em `prisma/seed.ts` (upsert idempotente, mesmo padrão dos
demais tipos). Sem outra mudança estrutural — usa o modelo `TipoAtividade` já existente.

### Sem campos novos em `OperacaoAgricola`

O acumulado de chuva por tratamento não é armazenado. É sempre calculado ao vivo a partir das
datas de `ChuvaRegistro` e `OperacaoAgricola`, eliminando qualquer necessidade de recálculo e
persistência — não existe cache para ficar desatualizado.

## 2. Aba Controle de Chuva

Nova rota `/chuva`, item no menu secundário (`SECONDARY_NAV_ITEMS`, junto de Diesel, Contagem de
Frutos etc.), ícone `CloudRain` (lucide-react).

- **Lista** (`/chuva`): leituras ordenadas por data decrescente, mostrando data, mm e observação
  (se houver). Uma linha por leitura, sem gráfico, sem agrupamento.
- **Nova leitura** (`/chuva/nova`): data (padrão hoje), quantidade em mm, observação opcional.
  Campo "Choveu antes ou depois do tratamento desse dia?" aparece só quando a data escolhida
  coincide com um tratamento fitossanitário já registrado (verificação simples ao mudar a data).
- **Editar/excluir** (`/chuva/[id]/editar`): mesmo formulário do cadastro, com opção de excluir —
  segue o padrão já usado em Diesel/Atividades/Tratamentos (server actions + revalidatePath).

Sem gráfico de acumulado nessa aba — é só o registro bruto das leituras. O acumulado por
tratamento é calculado e exibido na aba de Tratamentos (seção 3).

## 3. Integração com Tratamentos Fitossanitários

Em `src/app/(app)/tratamentos/page.tsx`, para cada talhão, ordena-se cronologicamente
(`data` asc, `createdAt` asc como desempate) só os tratamentos do tipo `FITOSSANITARIO`. Para
cada tratamento `Ti` nessa sequência, a janela de chuva acumulada é:

- **Início:** dia seguinte a `Ti`, ou o próprio dia de `Ti` se houver uma leitura de chuva nesse
  dia marcada como `DEPOIS`.
- **Fim:** dia do próximo tratamento fitossanitário do mesmo talhão `Ti+1` (inclusive), ou sem
  fim — acumula até hoje — se `Ti` for o tratamento mais recente do talhão.
- Chuva no dia de `Ti+1` marcada como `ANTES` conta para a janela de `Ti` (que está fechando);
  marcada como `DEPOIS` conta para a janela de `Ti+1` (que está abrindo). Sem marcação (dia sem
  coincidência com tratamento), usa-se a regra padrão de data.

Cálculo feito a cada carregamento da tela, sem armazenar nada — sempre correto mesmo com
lançamento retroativo de chuva.

**Exibição:** acima de cada card de tratamento fitossanitário, uma linha discreta:

```
🌧 32mm acumulados desde a aplicação
```

Só aparece se o acumulado for maior que zero. Tratamentos de Herbicida, Adubação e Outra não
recebem essa linha — só Fitossanitário.

## 4. Horas-Homem: atividade "Chuva"

- "Chuva" entra na lista de tipos de atividade, ao lado de Roçar, Podar, Colher etc.
- Em `atividade-form.tsx`, quando o tipo selecionado for "Chuva", o campo Talhão deixa de ser
  obrigatório (sem `*`, sem bloquear envio vazio). Para os demais tipos, continua obrigatório
  como hoje.
- Campos usados: data, quantidade de pessoas, horas por pessoa — os mesmos de qualquer atividade.
  Sem ligação com os mm registrados em Controle de Chuva; são independentes.
- Em `/relatorios/horas-homem`, registros de "Chuva" sem talhão aparecem com talhão em branco/"—"
  na listagem, mas entram normalmente no total geral de horas pagas.

## Fora do escopo

- Gráfico ou dashboard de chuva.
- Vínculo entre a atividade "Chuva" (horas-homem) e os mm registrados.
- Múltiplos pluviômetros — leitura única para a propriedade toda.
- Acumulado de chuva em Herbicida, Adubação ou Outra — só Fitossanitário.
