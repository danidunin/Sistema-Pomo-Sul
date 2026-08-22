"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { TipoPraga } from "@/generated/prisma/enums";
import { ehValorDoEnum } from "@/lib/enum";
import {
  exigirPropriedadeAtual,
  garantirPontoMonitoramentoDaPropriedade,
  garantirArmadilhaDaPropriedade,
  garantirTalhaoDaPropriedade,
} from "@/lib/propriedade";

// --- Pontos de Monitoramento ------------------------------------------------

function lerFormularioPonto(formData: FormData) {
  return {
    tipoPraga: String(formData.get("tipoPraga") ?? ""),
    nome: String(formData.get("nome") ?? "").trim(),
    safra: String(formData.get("safra") ?? "").trim(),
  };
}

function validarPonto(dados: ReturnType<typeof lerFormularioPonto>) {
  if (!dados.nome || !dados.safra) return "Preencha o nome do ponto e a safra.";
  if (!ehValorDoEnum(TipoPraga, dados.tipoPraga)) return "Selecione uma praga válida.";
  return undefined;
}

export async function criarPontoMonitoramento(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioPonto(formData);
  const erro = validarPonto(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  const tipoPraga = dados.tipoPraga as TipoPraga;

  const existente = await db.pontoMonitoramento.findUnique({
    where: { propriedadeId_tipoPraga_nome_safra: { propriedadeId, tipoPraga, nome: dados.nome, safra: dados.safra } },
  });
  if (existente) return "Já existe um ponto com esse nome, praga e safra nesta propriedade.";

  const ponto = await db.pontoMonitoramento.create({
    data: { propriedadeId, tipoPraga, nome: dados.nome, safra: dados.safra },
  });

  revalidatePath("/monitoramento-pragas/pontos");
  redirect(`/monitoramento-pragas/pontos/${ponto.id}`);
}

export async function atualizarPontoMonitoramento(
  pontoId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioPonto(formData);
  const erro = validarPonto(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirPontoMonitoramentoDaPropriedade(pontoId, propriedadeId))) return "Ponto inválido.";

  await db.pontoMonitoramento.update({
    where: { id: pontoId },
    data: { tipoPraga: dados.tipoPraga as TipoPraga, nome: dados.nome, safra: dados.safra },
  });

  revalidatePath("/monitoramento-pragas/pontos");
  revalidatePath(`/monitoramento-pragas/pontos/${pontoId}`);
  redirect(`/monitoramento-pragas/pontos/${pontoId}`);
}

export async function alternarAtivoPontoMonitoramento(pontoId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  const ponto = await db.pontoMonitoramento.findUnique({ where: { id: pontoId }, select: { propriedadeId: true, ativo: true } });
  if (!ponto || ponto.propriedadeId !== propriedadeId) return;

  await db.pontoMonitoramento.update({ where: { id: pontoId }, data: { ativo: !ponto.ativo } });
  revalidatePath("/monitoramento-pragas/pontos");
  revalidatePath(`/monitoramento-pragas/pontos/${pontoId}`);
}

export async function excluirPontoMonitoramento(pontoId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirPontoMonitoramentoDaPropriedade(pontoId, propriedadeId))) return;

  // Só bloqueia a exclusão definitiva se alguma armadilha do ponto já tem
  // leitura registrada de verdade — apagar quebraria esse histórico.
  const totalLeituras = await db.leituraArmadilha.count({ where: { armadilha: { pontoMonitoramentoId: pontoId } } });

  if (totalLeituras === 0) {
    await db.$transaction([
      db.armadilha.deleteMany({ where: { pontoMonitoramentoId: pontoId } }),
      db.pontoMonitoramento.delete({ where: { id: pontoId } }),
    ]);
    revalidatePath("/monitoramento-pragas/pontos");
    redirect("/monitoramento-pragas/pontos?resultado=excluido");
  } else {
    await db.pontoMonitoramento.update({ where: { id: pontoId }, data: { ativo: false } });
    revalidatePath("/monitoramento-pragas/pontos");
    redirect("/monitoramento-pragas/pontos?resultado=inativado");
  }
}

// --- Armadilhas -------------------------------------------------------------

function lerFormularioArmadilha(formData: FormData) {
  return {
    pontoMonitoramentoId: String(formData.get("pontoMonitoramentoId") ?? ""),
    talhaoId: String(formData.get("talhaoId") ?? ""),
    rotulo: String(formData.get("rotulo") ?? "").trim(),
  };
}

function validarArmadilha(dados: ReturnType<typeof lerFormularioArmadilha>) {
  if (!dados.pontoMonitoramentoId || !dados.talhaoId || !dados.rotulo) {
    return "Selecione o ponto de monitoramento, o talhão e informe o rótulo da armadilha.";
  }
  return undefined;
}

export async function criarArmadilha(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioArmadilha(formData);
  const erro = validarArmadilha(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirPontoMonitoramentoDaPropriedade(dados.pontoMonitoramentoId, propriedadeId))) {
    return "Ponto de monitoramento inválido para a propriedade atual.";
  }
  if (!(await garantirTalhaoDaPropriedade(dados.talhaoId, propriedadeId))) {
    return "Talhão inválido para a propriedade atual.";
  }

  await db.armadilha.create({
    data: { pontoMonitoramentoId: dados.pontoMonitoramentoId, talhaoId: dados.talhaoId, rotulo: dados.rotulo },
  });

  revalidatePath("/monitoramento-pragas/armadilhas");
  revalidatePath(`/monitoramento-pragas/pontos/${dados.pontoMonitoramentoId}`);
  redirect(`/monitoramento-pragas/pontos/${dados.pontoMonitoramentoId}`);
}

export async function atualizarArmadilha(
  armadilhaId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioArmadilha(formData);
  const erro = validarArmadilha(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirArmadilhaDaPropriedade(armadilhaId, propriedadeId))) return "Armadilha inválida.";
  if (!(await garantirPontoMonitoramentoDaPropriedade(dados.pontoMonitoramentoId, propriedadeId))) {
    return "Ponto de monitoramento inválido para a propriedade atual.";
  }
  if (!(await garantirTalhaoDaPropriedade(dados.talhaoId, propriedadeId))) {
    return "Talhão inválido para a propriedade atual.";
  }

  await db.armadilha.update({
    where: { id: armadilhaId },
    data: { pontoMonitoramentoId: dados.pontoMonitoramentoId, talhaoId: dados.talhaoId, rotulo: dados.rotulo },
  });

  revalidatePath("/monitoramento-pragas/armadilhas");
  revalidatePath(`/monitoramento-pragas/pontos/${dados.pontoMonitoramentoId}`);
  redirect(`/monitoramento-pragas/pontos/${dados.pontoMonitoramentoId}`);
}

export async function alternarAtivoArmadilha(armadilhaId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  const armadilha = await db.armadilha.findUnique({
    where: { id: armadilhaId },
    select: { ativo: true, pontoMonitoramentoId: true, pontoMonitoramento: { select: { propriedadeId: true } } },
  });
  if (!armadilha || armadilha.pontoMonitoramento.propriedadeId !== propriedadeId) return;

  await db.armadilha.update({ where: { id: armadilhaId }, data: { ativo: !armadilha.ativo } });
  revalidatePath("/monitoramento-pragas/armadilhas");
  revalidatePath(`/monitoramento-pragas/pontos/${armadilha.pontoMonitoramentoId}`);
}

export async function excluirArmadilha(armadilhaId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirArmadilhaDaPropriedade(armadilhaId, propriedadeId))) return;

  const armadilha = await db.armadilha.findUniqueOrThrow({
    where: { id: armadilhaId },
    select: { pontoMonitoramentoId: true },
  });
  const totalLeituras = await db.leituraArmadilha.count({ where: { armadilhaId } });

  if (totalLeituras === 0) {
    await db.armadilha.delete({ where: { id: armadilhaId } });
    revalidatePath("/monitoramento-pragas/armadilhas");
    revalidatePath(`/monitoramento-pragas/pontos/${armadilha.pontoMonitoramentoId}`);
    redirect(`/monitoramento-pragas/pontos/${armadilha.pontoMonitoramentoId}?resultado=excluido`);
  } else {
    await db.armadilha.update({ where: { id: armadilhaId }, data: { ativo: false } });
    revalidatePath("/monitoramento-pragas/armadilhas");
    revalidatePath(`/monitoramento-pragas/pontos/${armadilha.pontoMonitoramentoId}`);
    redirect(`/monitoramento-pragas/pontos/${armadilha.pontoMonitoramentoId}?resultado=inativado`);
  }
}
