"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual, garantirTanqueDaPropriedade } from "@/lib/propriedade";

function parseTanqueForm(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    capacidadeLitros: Number(formData.get("capacidadeLitros")),
    estoqueMinimoLitros: Number(formData.get("estoqueMinimoLitros")),
  };
}

export async function criarTanqueDiesel(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseTanqueForm(formData);
  const estoqueAtualLitros = Number(formData.get("estoqueAtualLitros"));

  if (!dados.nome || !dados.capacidadeLitros || dados.capacidadeLitros <= 0) {
    return "Informe o nome e a capacidade do tanque (maior que zero).";
  }
  if (!dados.estoqueMinimoLitros || dados.estoqueMinimoLitros < 0) {
    return "Informe o estoque mínimo para alerta.";
  }
  if (Number.isNaN(estoqueAtualLitros) || estoqueAtualLitros < 0) {
    return "Informe o estoque atual do tanque.";
  }
  if (estoqueAtualLitros > dados.capacidadeLitros) {
    return "O estoque atual não pode ser maior que a capacidade do tanque.";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  await db.tanqueDiesel.create({ data: { ...dados, estoqueAtualLitros, propriedadeId } });

  revalidatePath("/diesel");
  redirect("/diesel");
}

export async function atualizarTanqueDiesel(
  tanqueId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseTanqueForm(formData);

  if (!dados.nome || !dados.capacidadeLitros || dados.capacidadeLitros <= 0) {
    return "Informe o nome e a capacidade do tanque (maior que zero).";
  }
  if (!dados.estoqueMinimoLitros || dados.estoqueMinimoLitros < 0) {
    return "Informe o estoque mínimo para alerta.";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirTanqueDaPropriedade(tanqueId, propriedadeId))) {
    return "Tanque inválido para a propriedade atual.";
  }

  await db.tanqueDiesel.update({ where: { id: tanqueId }, data: dados });

  revalidatePath("/diesel");
  redirect("/diesel");
}

export async function criarMovimentacaoDiesel(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const tipoRaw = String(formData.get("tipo") ?? "");
  const tanqueId = String(formData.get("tanqueId") ?? "");
  const quantidade = Number(formData.get("quantidadeLitros"));
  const dataStr = String(formData.get("data") ?? "");
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  if ((tipoRaw !== "ENTRADA" && tipoRaw !== "SAIDA") || !tanqueId || !quantidade || quantidade <= 0 || !dataStr) {
    return "Selecione o tipo, o tanque, a data e uma quantidade maior que zero.";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirTanqueDaPropriedade(tanqueId, propriedadeId))) {
    return "Tanque inválido para a propriedade atual.";
  }

  if (tipoRaw === "SAIDA") {
    // Checagem e baixa acontecem atomicamente dentro da mesma transação — igual a
    // criarMovimentacaoEstoque em src/actions/estoque.ts — para nunca deixar o tanque negativo
    // mesmo com duas saídas simultâneas.
    const saidaAplicada = await db.$transaction(async (tx) => {
      const baixa = await tx.tanqueDiesel.updateMany({
        where: { id: tanqueId, estoqueAtualLitros: { gte: quantidade } },
        data: { estoqueAtualLitros: { decrement: quantidade } },
      });
      if (baixa.count === 0) return false;

      await tx.dieselMovimentacao.create({
        data: { tanqueId, tipo: "SAIDA", quantidadeLitros: quantidade, data: new Date(dataStr), observacoes },
      });
      return true;
    });

    if (!saidaAplicada) {
      return "Quantidade de saída maior que o disponível no tanque.";
    }
  } else {
    await db.$transaction([
      db.dieselMovimentacao.create({
        data: { tanqueId, tipo: "ENTRADA", quantidadeLitros: quantidade, data: new Date(dataStr), observacoes },
      }),
      db.tanqueDiesel.update({
        where: { id: tanqueId },
        data: { estoqueAtualLitros: { increment: quantidade } },
      }),
    ]);
  }

  revalidatePath("/diesel");
  revalidatePath("/diesel/historico");
  redirect("/diesel");
}
