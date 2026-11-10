"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UnidadeDosagem } from "@/generated/prisma/enums";
import { exigirPropriedadeAtual, garantirProdutoDaPropriedade } from "@/lib/propriedade";
import { ehValorDoEnum } from "@/lib/enum";
import { mesmoProduto, padronizarNomeProduto } from "@/lib/produto-nome";

function parseProdutoForm(formData: FormData) {
  const unidadeDosagemRaw = String(formData.get("unidadeDosagem") ?? "");
  const limiteRaw = String(formData.get("limiteAplicacoesCiclo") ?? "").trim();
  return {
    nome: padronizarNomeProduto(String(formData.get("nome") ?? "")),
    unidade: String(formData.get("unidade") ?? "").trim(),
    unidadeDosagem: (unidadeDosagemRaw || null) as UnidadeDosagem | null,
    limiteAplicacoesCiclo: limiteRaw ? Number(limiteRaw) : null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

/**
 * Mensagem de erro se já existir, na mesma fazenda, um produto com o mesmo nome
 * (ignorando acento/maiúscula/espaço) e a mesma unidade. Conta também os inativos.
 */
async function mensagemProdutoRepetido(
  propriedadeId: string,
  novo: { nome: string; unidade: string },
  ignorarProdutoId?: string,
): Promise<string | undefined> {
  const produtos = await db.produto.findMany({
    where: { propriedadeId },
    select: { id: true, nome: true, unidade: true, ativo: true },
  });
  const repetido = produtos.find((p) => p.id !== ignorarProdutoId && mesmoProduto(p, novo));
  if (!repetido) return undefined;
  return repetido.ativo
    ? `Já existe ${repetido.nome} (${repetido.unidade}) nesta fazenda.`
    : `Já existe ${repetido.nome} (${repetido.unidade}) nesta fazenda, marcado como inativo. Reative ele em vez de cadastrar outro.`;
}

export async function criarProduto(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseProdutoForm(formData);

  if (!dados.nome || !dados.unidade) {
    return "Informe o nome e a unidade do produto.";
  }
  if (dados.unidadeDosagem && !ehValorDoEnum(UnidadeDosagem, dados.unidadeDosagem)) {
    return "Unidade de dosagem inválida.";
  }
  if (
    dados.limiteAplicacoesCiclo !== null &&
    (!Number.isInteger(dados.limiteAplicacoesCiclo) ||
      dados.limiteAplicacoesCiclo <= 0 ||
      dados.limiteAplicacoesCiclo > 1000)
  ) {
    return "Máximo de aplicações por ciclo deve ser um número inteiro entre 1 e 1000.";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  const repetido = await mensagemProdutoRepetido(propriedadeId, dados);
  if (repetido) return repetido;

  await db.produto.create({ data: { ...dados, propriedadeId } });

  revalidatePath("/estoque");
  redirect("/estoque");
}

export async function atualizarProduto(
  produtoId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseProdutoForm(formData);

  if (!dados.nome || !dados.unidade) {
    return "Informe o nome e a unidade do produto.";
  }
  if (dados.unidadeDosagem && !ehValorDoEnum(UnidadeDosagem, dados.unidadeDosagem)) {
    return "Unidade de dosagem inválida.";
  }
  if (
    dados.limiteAplicacoesCiclo !== null &&
    (!Number.isInteger(dados.limiteAplicacoesCiclo) ||
      dados.limiteAplicacoesCiclo <= 0 ||
      dados.limiteAplicacoesCiclo > 1000)
  ) {
    return "Máximo de aplicações por ciclo deve ser um número inteiro entre 1 e 1000.";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirProdutoDaPropriedade(produtoId, propriedadeId))) {
    return "Produto inválido para a propriedade atual.";
  }

  // Só checa repetição se o nome ou a unidade mudou — assim editar outro campo
  // (ex: observações) de um produto antigo nunca fica bloqueado.
  const atual = await db.produto.findUnique({ where: { id: produtoId }, select: { nome: true, unidade: true } });
  if (!atual || !mesmoProduto(atual, dados)) {
    const repetido = await mensagemProdutoRepetido(propriedadeId, dados, produtoId);
    if (repetido) return repetido;
  }

  await db.produto.update({ where: { id: produtoId }, data: dados });

  revalidatePath("/estoque");
  redirect("/estoque");
}

export async function excluirProduto(produtoId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirProdutoDaPropriedade(produtoId, propriedadeId))) return;

  // Só o uso em tratamentos (operacao_produtos) bloqueia a exclusão definitiva —
  // é o único vínculo que não pode ser desfeito sem quebrar o histórico de tratamentos.
  // Movimentações manuais de estoque (entradas/saídas avulsas) não bloqueiam: são
  // apagadas junto com o produto.
  const totalUsosEmOperacoes = await db.operacaoProduto.count({ where: { produtoId } });

  if (totalUsosEmOperacoes === 0) {
    await db.$transaction([
      db.estoqueMovimentacao.deleteMany({ where: { produtoId } }),
      db.produto.delete({ where: { id: produtoId } }),
    ]);
    revalidatePath("/estoque");
    redirect("/estoque?resultado=excluido");
  } else {
    // Produto já tem uso em tratamentos — excluir quebraria esses registros.
    // Marca como inativo em vez de apagar.
    await db.produto.update({ where: { id: produtoId }, data: { ativo: false } });
    revalidatePath("/estoque");
    redirect("/estoque?resultado=inativado");
  }
}

export async function alternarAtivoProduto(produtoId: string, ativo: boolean) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirProdutoDaPropriedade(produtoId, propriedadeId))) return;

  await db.produto.update({ where: { id: produtoId }, data: { ativo } });
  revalidatePath("/estoque");
  revalidatePath(`/estoque/produtos/${produtoId}/editar`);
}

export async function criarMovimentacaoEstoque(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const tipoRaw = String(formData.get("tipo") ?? "");
  const produtoId = String(formData.get("produtoId") ?? "");
  const quantidade = Number(formData.get("quantidade"));
  const dataStr = String(formData.get("data") ?? "");
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  if ((tipoRaw !== "ENTRADA" && tipoRaw !== "SAIDA") || !produtoId || !quantidade || quantidade <= 0 || !dataStr) {
    return "Selecione o tipo, o produto, a data e uma quantidade maior que zero.";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirProdutoDaPropriedade(produtoId, propriedadeId))) {
    return "Produto inválido para a propriedade atual.";
  }

  if (tipoRaw === "SAIDA") {
    // Checagem e baixa acontecem atomicamente dentro da mesma transação: o
    // updateMany só afeta a linha se quantidadeDisponivel ainda for >= a saída
    // no momento exato do commit. Isso evita que duas saídas simultâneas leiam
    // o mesmo saldo "por fora" e ambas passem, deixando o estoque negativo.
    const saidaAplicada = await db.$transaction(async (tx) => {
      const baixa = await tx.produto.updateMany({
        where: { id: produtoId, quantidadeDisponivel: { gte: quantidade } },
        data: { quantidadeDisponivel: { decrement: quantidade } },
      });
      if (baixa.count === 0) return false;

      await tx.estoqueMovimentacao.create({
        data: {
          produtoId,
          tipo: "SAIDA",
          quantidade,
          data: new Date(dataStr),
          origemTipo: "MANUAL",
          observacoes,
        },
      });
      return true;
    });

    if (!saidaAplicada) {
      return "Quantidade de saída maior que o disponível em estoque.";
    }
  } else {
    await db.$transaction([
      db.estoqueMovimentacao.create({
        data: {
          produtoId,
          tipo: "ENTRADA",
          quantidade,
          data: new Date(dataStr),
          origemTipo: "MANUAL",
          observacoes,
        },
      }),
      db.produto.update({
        where: { id: produtoId },
        data: { quantidadeDisponivel: { increment: quantidade } },
      }),
    ]);
  }

  revalidatePath("/estoque");
  redirect("/estoque");
}
