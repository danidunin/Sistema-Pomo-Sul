"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { TipoPraga } from "@/generated/prisma/enums";
import { ehValorDoEnum } from "@/lib/enum";
import {
  exigirPropriedadeAtual,
  garantirPontoMonitoramentoDaPropriedade,
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
