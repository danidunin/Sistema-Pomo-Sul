"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function criarProduto(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const nome = String(formData.get("nome") ?? "").trim();
  const unidade = String(formData.get("unidade") ?? "").trim();
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  if (!nome || !unidade) {
    return "Informe o nome e a unidade do produto.";
  }

  await db.produto.create({ data: { nome, unidade, observacoes } });

  revalidatePath("/estoque");
  redirect("/estoque");
}

export async function criarMovimentacaoEntrada(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const produtoId = String(formData.get("produtoId") ?? "");
  const quantidade = Number(formData.get("quantidade"));
  const dataStr = String(formData.get("data") ?? "");
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  if (!produtoId || !quantidade || quantidade <= 0 || !dataStr) {
    return "Selecione o produto, a data e uma quantidade maior que zero.";
  }

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

  revalidatePath("/estoque");
  redirect("/estoque");
}
