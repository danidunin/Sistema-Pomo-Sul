"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { UnidadeDosagem } from "@/generated/prisma/enums";
import { exigirPropriedadeAtual } from "@/lib/propriedade";

function parseProdutoForm(formData: FormData) {
  const unidadeDosagemRaw = String(formData.get("unidadeDosagem") ?? "");
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    unidade: String(formData.get("unidade") ?? "").trim(),
    unidadeDosagem: (unidadeDosagemRaw || null) as UnidadeDosagem | null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

export async function criarProduto(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseProdutoForm(formData);

  if (!dados.nome || !dados.unidade) {
    return "Informe o nome e a unidade do produto.";
  }

  const propriedadeId = await exigirPropriedadeAtual();
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

  await db.produto.update({ where: { id: produtoId }, data: dados });

  revalidatePath("/estoque");
  redirect("/estoque");
}

export async function excluirProduto(produtoId: string) {
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

  if (tipoRaw === "SAIDA") {
    const produto = await db.produto.findUnique({ where: { id: produtoId }, select: { quantidadeDisponivel: true } });
    if (!produto || quantidade > Number(produto.quantidadeDisponivel)) {
      return "Quantidade de saída maior que o disponível em estoque.";
    }
  }

  await db.$transaction([
    db.estoqueMovimentacao.create({
      data: {
        produtoId,
        tipo: tipoRaw,
        quantidade,
        data: new Date(dataStr),
        origemTipo: "MANUAL",
        observacoes,
      },
    }),
    db.produto.update({
      where: { id: produtoId },
      data: {
        quantidadeDisponivel: tipoRaw === "ENTRADA" ? { increment: quantidade } : { decrement: quantidade },
      },
    }),
  ]);

  revalidatePath("/estoque");
  redirect("/estoque");
}
