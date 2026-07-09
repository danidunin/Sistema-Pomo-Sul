"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { TipoOperacao } from "@/generated/prisma/enums";

export async function criarOperacao(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  const responsavelId = session?.user?.id;
  if (!responsavelId) {
    return "Sessão expirada. Faça login novamente.";
  }

  const tipo = String(formData.get("tipo") ?? "") as TipoOperacao;
  const dataStr = String(formData.get("data") ?? "");
  const talhaoId = String(formData.get("talhaoId") ?? "");
  const operadorId = String(formData.get("operadorId") ?? "") || null;
  const maquinaId = String(formData.get("maquinaId") ?? "") || null;
  const volumeCaldaRaw = formData.get("volumeCalda");
  const volumeCalda = volumeCaldaRaw ? Number(volumeCaldaRaw) : null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  const produtoIds = formData.getAll("produtoId[]").map(String);
  const quantidades = formData.getAll("quantidade[]").map(Number);
  const unidades = formData.getAll("unidade[]").map(String);

  if (!tipo || !dataStr || !talhaoId) {
    return "Preencha o tipo, a data e o talhão.";
  }

  const itens = produtoIds
    .map((produtoId, i) => ({ produtoId, quantidade: quantidades[i], unidade: unidades[i] }))
    .filter((item) => item.produtoId && item.quantidade > 0);

  if (itens.length === 0) {
    return "Adicione ao menos um produto com quantidade maior que zero.";
  }

  const operacao = await db.$transaction(async (tx) => {
    const novaOperacao = await tx.operacaoAgricola.create({
      data: {
        tipo,
        data: new Date(dataStr),
        talhaoId,
        responsavelId,
        operadorId,
        maquinaId,
        volumeCalda,
        observacoes,
      },
    });

    for (const item of itens) {
      await tx.operacaoProduto.create({
        data: {
          operacaoId: novaOperacao.id,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          unidade: item.unidade,
        },
      });

      await tx.estoqueMovimentacao.create({
        data: {
          produtoId: item.produtoId,
          tipo: "SAIDA",
          quantidade: item.quantidade,
          data: new Date(dataStr),
          origemTipo: "OPERACAO",
          origemOperacaoId: novaOperacao.id,
        },
      });

      await tx.produto.update({
        where: { id: item.produtoId },
        data: { quantidadeDisponivel: { decrement: item.quantidade } },
      });
    }

    return novaOperacao;
  });

  revalidatePath("/operacoes");
  revalidatePath("/estoque");
  revalidatePath(`/talhoes/${talhaoId}`);
  redirect(`/operacoes/${operacao.id}`);
}
