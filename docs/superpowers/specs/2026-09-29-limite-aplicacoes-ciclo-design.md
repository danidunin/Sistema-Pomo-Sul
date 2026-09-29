# Limite de aplicações por ciclo (Tratamentos)

## Problema

O caderno de campo (Tratamentos) hoje lista as aplicações por quadra e por data, mas não dá
nenhuma visão de quantas vezes um produto já foi aplicado em cada quadra dentro do ano
agrícola. Com muitas quadras, fica difícil:

1. Saber se um produto-chave (ex: um fungicida com limite regulatório/agronômico) já passou
   do número de aplicações recomendado numa quadra específica.
2. Conferir se todas as aplicações planejadas para o ciclo já foram feitas em todas as
   quadras.

## Ciclo agrícola

O ciclo é fixo: começa em **1º de maio** e termina em **30 de abril** do ano seguinte,
identificado pelo par de anos (ex: `2026/2027`). Não existe cadastro de ciclo — é sempre
calculado a partir da data de cada tratamento:

- Data com mês >= maio → ciclo `<ano>/<ano+1>`
- Data com mês < maio → ciclo `<ano-1>/<ano>`

Isso é uma função pura, sem estado no banco:

```ts
// src/lib/ciclo.ts
export type Ciclo = { anoInicio: number; label: string; inicio: Date; fim: Date };

export function cicloDaData(data: Date): Ciclo {
  const anoInicio = data.getMonth() + 1 >= 5 ? data.getFullYear() : data.getFullYear() - 1;
  return {
    anoInicio,
    label: `${anoInicio}/${anoInicio + 1}`,
    inicio: new Date(anoInicio, 4, 1), // 1º de maio
    fim: new Date(anoInicio + 1, 3, 30), // 30 de abril
  };
}

export function cicloAtual(): Ciclo {
  return cicloDaData(new Date());
}
```

## Modelo de dados

Um único campo novo em `Produto`, opcional. Quando preenchido, o produto passa a ser
tratado como "produto-chave" e entra automaticamente no resumo do ciclo — não existe um
checkbox separado de "é chave".

```prisma
model Produto {
  // ...campos existentes
  limiteAplicacoesCiclo Int? @map("limite_aplicacoes_ciclo")
}
```

Migration: `prisma/migrations/<timestamp>_limite_aplicacoes_ciclo/migration.sql` adicionando
a coluna nullable (sem backfill necessário).

O limite é **por produto**, não por quadra: o mesmo número vale em todas as quadras onde o
produto for usado. A **contagem** (quantas vezes já foi aplicado) é sempre por quadra.

"Número de aplicações" = número de `OperacaoAgricola` distintas que têm uma linha
`OperacaoProduto` para aquele produto naquela quadra dentro da janela do ciclo — não é soma
de quantidade/volume. Conta em qualquer `TipoOperacao` (fitossanitário, herbicida, adubação,
outra), porque o limite é sobre o produto em si, não sobre o tipo de operação.

## Cadastro do limite

Adicionar um campo ao formulário existente em
[`produto-form.tsx`](../../src/components/estoque/produto-form.tsx) (usado tanto em
`/estoque/produtos/novo` quanto em `/estoque/produtos/[id]/editar`):

- Label: "Máximo de aplicações por ciclo"
- Input numérico, opcional, inteiro positivo
- Texto de apoio: "Se preenchido, este produto aparece no Resumo do ciclo em Tratamentos,
  comparando o número de aplicações em cada quadra com este limite."

`parseProdutoForm` (em `src/actions/estoque.ts`) passa a ler `limiteAplicacoesCiclo` do
FormData (`null` se vazio, senão `Number(...)`), validando que é um inteiro positivo quando
informado. `criarProduto`/`atualizarProduto` continuam salvando via spread de `dados`, sem
mudança de estrutura.

## Tela-resumo (matriz quadra × produto)

Nova rota `/tratamentos/resumo`, um botão "Resumo do ciclo" ao lado de "+ Novo tratamento"
em [`tratamentos/page.tsx`](../../src/app/(app)/tratamentos/page.tsx).

**Dados:** para a propriedade atual, busca:
- Todos os produtos com `limiteAplicacoesCiclo` não nulo (colunas da matriz).
- Todos os talhões (linhas da matriz).
- Todas as `OperacaoProduto` (join `OperacaoAgricola`) desses produtos, filtradas pela janela
  de datas do ciclo selecionado.

**Seletor de ciclo:** dropdown/abas no topo com o ciclo atual pré-selecionado e alguns
ciclos anteriores disponíveis (calculados a partir do ciclo do tratamento mais antigo
registrado até o ciclo atual — sem gerar ciclos futuros vazios).

**Matriz:**
- Linha = quadra (`Talhao.nomeCodinome`), coluna = produto-chave (`Produto.nome`).
- Célula = `"<contagem>/<limite>"`.
- Cor da célula:
  - cinza: contagem = 0
  - verde: `0 < contagem < limite`
  - amarelo: `contagem == limite`
  - vermelho: `contagem > limite`
- Sem produtos-chave cadastrados → mensagem "Nenhum produto com limite de aplicações
  cadastrado. Defina em Estoque → editar produto." em vez de matriz vazia.

Fora de escopo nesta primeira versão: clique na célula abrindo lista filtrada por
produto+quadra (a navegação por quadra já existe em `/tratamentos?talhaoId=`; adicionar
filtro por produto também fica para depois, se for pedido).

## Aviso no formulário de novo/editar tratamento

Em [`operacao-form.tsx`](../../src/components/operacoes/operacao-form.tsx), ao lado de cada
linha de produto escolhido, mostrar um aviso quando esse produto (nesta quadra, no ciclo da
data selecionada) já está no limite ou acima dele:

> ⚠️ Este produto já tem 4 de 4 aplicações nesta quadra neste ciclo.

Não bloqueia o envio — é só um aviso.

**Como calcular no cliente sem nova query a cada digitação:** a página server-side
(`/tratamentos/nova` e `/tratamentos/[id]/editar`) já carrega produtos e talhões para montar
o formulário. Ela passa adicionalmente, só para os produtos-chave, uma contagem pré-agregada
por quadra e por ciclo:

```ts
type ContagemProdutoChave = {
  produtoId: string;
  limite: number;
  porQuadraECiclo: Record<string /* talhaoId */, Record<string /* cicloLabel */, number>>;
};
```

No modo editar, a contagem exclui a própria `OperacaoAgricola` sendo editada (para não se
contar em dobro quando o usuário reabre e salva sem mudar o produto).

O componente calcula `cicloDaData(dataSelecionada)` no cliente (função pura, sem I/O) e faz o
lookup `porQuadraECiclo[talhaoId]?.[cicloLabel] ?? 0` para decidir se mostra o aviso, agrupado por produto (`produtoId` selecionado na linha).
Isso mantém o formulário reativo a mudanças de quadra/produto/data sem round-trip ao
servidor.

## Testes

- `src/lib/ciclo.ts`: testes unitários cobrindo a virada de ciclo (abril→maio) e datas em
  qualquer ponto do ano.
- Contagem da matriz: teste de que aplicações fora da janela do ciclo (ex: 29/04 vs 01/05)
  não se misturam entre ciclos.
- Exclusão do próprio registro ao editar um tratamento (não conta em dobro).

## Fora de escopo

- Não bloquear o envio do formulário quando o limite é excedido.
- Não permitir limite diferente por quadra para o mesmo produto.
- Não criar cadastro/edição manual de datas de ciclo (é sempre maio–abril, fixo).
- Não adicionar filtro por produto na listagem de tratamentos (`/tratamentos`).
