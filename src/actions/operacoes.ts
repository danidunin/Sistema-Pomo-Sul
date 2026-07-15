"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { TipoOperacao } from "@/generated/prisma/enums";
import { calcularQuantidade, unidadeCanonica, converterParaUnidadeEstoque } from "@/lib/concentracao";
import { exigirPropriedadeAtual } from "@/lib/propriedade";

type ItemOperacao = { produtoId: string; concentracao: number; quantidade: number; unidade: string };

type DadosFormularioOperacao = {
  tipo: TipoOperacao;
  dataStr: string;
  talhaoId: string;
  operadorId: string | null;
  maquinaId: string | null;
  volumeCalda: number | null;
  numeroPessoas: number | null;
  horasPorPessoa: number | null;
  horasMaquina: number | null;
  observacoes: string | null;
  itensBrutos: { produtoId: string; concentracao: number }[];
};

function lerFormularioOperacao(formData: FormData): DadosFormularioOperacao {
  const produtoIds = formData.getAll("produtoId[]").map(String);
  const concentracoes = formData.getAll("concentracao[]").map(Number);

  return {
    tipo: String(formData.get("tipo") ?? "") as TipoOperacao,
    dataStr: String(formData.get("data") ?? ""),
    talhaoId: String(formData.get("talhaoId") ?? ""),
    operadorId: String(formData.get("operadorId") ?? "") || null,
    maquinaId: String(formData.get("maquinaId") ?? "") || null,
    volumeCalda: formData.get("volumeCalda") ? Number(formData.get("volumeCalda")) : null,
    numeroPessoas: formData.get("numeroPessoas") ? Number(formData.get("numeroPessoas")) : null,
    horasPorPessoa: formData.get("horasPorPessoa") ? Number(formData.get("horasPorPessoa")) : null,
    horasMaquina: formData.get("horasMaquina") ? Number(formData.get("horasMaquina")) : null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    itensBrutos: produtoIds
      .map((produtoId, i) => ({ produtoId, concentracao: concentracoes[i] }))
      .filter((item) => item.produtoId && item.concentracao > 0),
  };
}

/**
 * Valida o talhão/produtos contra a propriedade atual e calcula a quantidade final de
 * cada item (sempre na unidade cadastrada do produto). Reaproveitado por criar e editar
 * — garante que os dois caminhos calculam exatamente da mesma forma.
 */
async function calcularItensOperacao(
  dados: DadosFormularioOperacao,
  propriedadeId: string,
): Promise<{ erro: string } | { itens: ItemOperacao[] }> {
  const talhao = await db.talhao.findUnique({
    where: { id: dados.talhaoId },
    select: { areaHa: true, propriedadeId: true },
  });
  if (!talhao || talhao.propriedadeId !== propriedadeId) {
    return { erro: "Talhão inválido para a propriedade atual." };
  }

  const produtosUsados = await db.produto.findMany({
    where: { id: { in: dados.itensBrutos.map((i) => i.produtoId) }, propriedadeId },
  });

  const itens: ItemOperacao[] = [];

  for (const item of dados.itensBrutos) {
    const produto = produtosUsados.find((p) => p.id === item.produtoId);
    if (!produto?.unidadeDosagem) {
      return { erro: `O produto "${produto?.nome ?? item.produtoId}" não tem unidade de dosagem cadastrada. Defina em Estoque antes de usá-lo em um tratamento.` };
    }

    const quantidadeCalculada = calcularQuantidade({
      concentracao: item.concentracao,
      unidadeDosagem: produto.unidadeDosagem,
      volumeCalda: dados.volumeCalda,
      areaHa: talhao.areaHa ? Number(talhao.areaHa) : null,
    });

    if (quantidadeCalculada === null) {
      const precisaVolume = produto.unidadeDosagem !== "L_HA" && produto.unidadeDosagem !== "KG_HA";
      return {
        erro: precisaVolume
          ? "Informe o volume de calda para calcular a quantidade dos produtos."
          : "O talhão selecionado não tem área (ha) cadastrada, necessária para calcular a quantidade deste produto.",
      };
    }

    // Converte imediatamente para a unidade cadastrada do produto — a quantidade
    // exibida e a baixa de estoque sempre respeitam essa unidade (peso ou volume).
    const quantidadeNaUnidadeDoProduto = converterParaUnidadeEstoque(
      quantidadeCalculada,
      unidadeCanonica(produto.unidadeDosagem),
      produto.unidade,
    );

    itens.push({
      produtoId: item.produtoId,
      concentracao: item.concentracao,
      quantidade: quantidadeNaUnidadeDoProduto,
      unidade: produto.unidade,
    });
  }

  return { itens };
}

export async function criarOperacao(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  const responsavelId = session?.user?.id;
  if (!responsavelId) {
    return "Sessão expirada. Faça login novamente.";
  }

  const dados = lerFormularioOperacao(formData);

  if (!dados.tipo || !dados.dataStr || !dados.talhaoId) {
    return "Preencha o tipo, a data e o talhão.";
  }
  if (dados.itensBrutos.length === 0) {
    return "Adicione ao menos um produto com concentração maior que zero.";
  }
  if (!dados.numeroPessoas || dados.numeroPessoas < 1 || !dados.horasPorPessoa || dados.horasPorPessoa <= 0) {
    return "Informe a quantidade de pessoas e as horas por pessoa, maior que zero.";
  }
  if (!dados.horasMaquina || dados.horasMaquina <= 0) {
    return "Informe as horas de máquina, maior que zero.";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  const resultado = await calcularItensOperacao(dados, propriedadeId);
  if ("erro" in resultado) return resultado.erro;

  const operacao = await db.$transaction(async (tx) => {
    const novaOperacao = await tx.operacaoAgricola.create({
      data: {
        tipo: dados.tipo,
        data: new Date(dados.dataStr),
        talhaoId: dados.talhaoId,
        responsavelId,
        operadorId: dados.operadorId,
        maquinaId: dados.maquinaId,
        volumeCalda: dados.volumeCalda,
        numeroPessoas: dados.numeroPessoas,
        horasPorPessoa: dados.horasPorPessoa,
        horasMaquina: dados.horasMaquina,
        observacoes: dados.observacoes,
      },
    });

    for (const item of resultado.itens) {
      await tx.operacaoProduto.create({
        data: {
          operacaoId: novaOperacao.id,
          produtoId: item.produtoId,
          concentracao: item.concentracao,
          quantidade: item.quantidade,
          unidade: item.unidade,
        },
      });

      await tx.estoqueMovimentacao.create({
        data: {
          produtoId: item.produtoId,
          tipo: "SAIDA",
          quantidade: item.quantidade,
          data: new Date(dados.dataStr),
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

  revalidatePath("/tratamentos");
  revalidatePath("/estoque");
  revalidatePath(`/talhoes/${dados.talhaoId}`);
  redirect(`/tratamentos/${operacao.id}`);
}

export async function atualizarOperacao(
  operacaoId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioOperacao(formData);

  if (!dados.tipo || !dados.dataStr || !dados.talhaoId) {
    return "Preencha o tipo, a data e o talhão.";
  }
  if (dados.itensBrutos.length === 0) {
    return "Adicione ao menos um produto com concentração maior que zero.";
  }
  if (!dados.numeroPessoas || dados.numeroPessoas < 1 || !dados.horasPorPessoa || dados.horasPorPessoa <= 0) {
    return "Informe a quantidade de pessoas e as horas por pessoa, maior que zero.";
  }
  if (!dados.horasMaquina || dados.horasMaquina <= 0) {
    return "Informe as horas de máquina, maior que zero.";
  }

  const propriedadeId = await exigirPropriedadeAtual();

  const existente = await db.operacaoAgricola.findUnique({
    where: { id: operacaoId },
    select: { talhao: { select: { propriedadeId: true } }, movimentacoes: { select: { id: true, produtoId: true, quantidade: true } } },
  });
  if (!existente || existente.talhao.propriedadeId !== propriedadeId) {
    return "Tratamento inválido para a propriedade atual.";
  }

  const resultado = await calcularItensOperacao(dados, propriedadeId);
  if ("erro" in resultado) return resultado.erro;

  await db.$transaction(async (tx) => {
    // Zera o estado anterior: devolve ao estoque tudo que tinha sido baixado
    // e remove os itens/movimentações antigos, para nunca duplicar.
    for (const mov of existente.movimentacoes) {
      await tx.produto.update({
        where: { id: mov.produtoId },
        data: { quantidadeDisponivel: { increment: mov.quantidade } },
      });
      await tx.estoqueMovimentacao.delete({ where: { id: mov.id } });
    }
    await tx.operacaoProduto.deleteMany({ where: { operacaoId } });

    await tx.operacaoAgricola.update({
      where: { id: operacaoId },
      data: {
        tipo: dados.tipo,
        data: new Date(dados.dataStr),
        talhaoId: dados.talhaoId,
        operadorId: dados.operadorId,
        maquinaId: dados.maquinaId,
        volumeCalda: dados.volumeCalda,
        numeroPessoas: dados.numeroPessoas,
        horasPorPessoa: dados.horasPorPessoa,
        horasMaquina: dados.horasMaquina,
        observacoes: dados.observacoes,
      },
    });

    for (const item of resultado.itens) {
      await tx.operacaoProduto.create({
        data: {
          operacaoId,
          produtoId: item.produtoId,
          concentracao: item.concentracao,
          quantidade: item.quantidade,
          unidade: item.unidade,
        },
      });

      await tx.estoqueMovimentacao.create({
        data: {
          produtoId: item.produtoId,
          tipo: "SAIDA",
          quantidade: item.quantidade,
          data: new Date(dados.dataStr),
          origemTipo: "OPERACAO",
          origemOperacaoId: operacaoId,
        },
      });

      await tx.produto.update({
        where: { id: item.produtoId },
        data: { quantidadeDisponivel: { decrement: item.quantidade } },
      });
    }
  });

  revalidatePath("/tratamentos");
  revalidatePath("/estoque");
  revalidatePath(`/talhoes/${dados.talhaoId}`);
  redirect(`/tratamentos/${operacaoId}`);
}

export async function excluirOperacao(operacaoId: string) {
  const operacao = await db.operacaoAgricola.findUnique({
    where: { id: operacaoId },
    select: { talhaoId: true, movimentacoes: { select: { id: true, produtoId: true, quantidade: true } } },
  });

  if (!operacao) return;

  await db.$transaction(async (tx) => {
    // Devolve ao estoque a quantidade que tinha sido baixada por este tratamento.
    for (const mov of operacao.movimentacoes) {
      await tx.produto.update({
        where: { id: mov.produtoId },
        data: { quantidadeDisponivel: { increment: mov.quantidade } },
      });
      await tx.estoqueMovimentacao.delete({ where: { id: mov.id } });
    }

    // operacao_produtos é excluído em cascata junto com a operação.
    await tx.operacaoAgricola.delete({ where: { id: operacaoId } });
  });

  revalidatePath("/tratamentos");
  revalidatePath("/estoque");
  revalidatePath(`/talhoes/${operacao.talhaoId}`);
  redirect(`/tratamentos?talhaoId=${operacao.talhaoId}`);
}
