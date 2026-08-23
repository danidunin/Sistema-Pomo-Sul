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
  garantirLeituraDaPropriedade,
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

  const tipoPraga = dados.tipoPraga as TipoPraga;
  const colidente = await db.pontoMonitoramento.findFirst({
    where: { propriedadeId, tipoPraga, nome: dados.nome, safra: dados.safra, NOT: { id: pontoId } },
    select: { id: true },
  });
  if (colidente) return "Já existe um ponto com esse nome, praga e safra nesta propriedade.";

  await db.pontoMonitoramento.update({
    where: { id: pontoId },
    data: { tipoPraga, nome: dados.nome, safra: dados.safra },
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

// --- Leituras (lançamento em lote) ------------------------------------------

export async function criarLeiturasEmLote(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const tipoPragaRaw = String(formData.get("tipoPraga") ?? "");
  const safra = String(formData.get("safra") ?? "").trim();
  const dataStr = String(formData.get("data") ?? "");
  const armadilhaIds = formData.getAll("armadilhaId[]").map(String);
  const quantidadesRaw = formData.getAll("quantidade[]").map(String);

  if (!ehValorDoEnum(TipoPraga, tipoPragaRaw)) return "Praga inválida.";
  if (!safra || !dataStr) return "Selecione a safra e a data da leitura.";

  const itens = armadilhaIds
    .map((armadilhaId, i) => ({ armadilhaId, quantidadeRaw: quantidadesRaw[i] ?? "" }))
    .filter((item) => item.quantidadeRaw !== "");

  if (itens.length === 0) return "Preencha ao menos uma armadilha antes de salvar.";
  if (itens.some((item) => !Number.isInteger(Number(item.quantidadeRaw)) || Number(item.quantidadeRaw) < 0)) {
    return "As quantidades devem ser números inteiros não negativos.";
  }

  const propriedadeId = await exigirPropriedadeAtual();

  const armadilhas = await db.armadilha.findMany({
    where: { id: { in: itens.map((i) => i.armadilhaId) } },
    select: { id: true, pontoMonitoramento: { select: { propriedadeId: true } } },
  });
  const idsValidos = new Set(
    armadilhas.filter((a) => a.pontoMonitoramento.propriedadeId === propriedadeId).map((a) => a.id),
  );
  if (itens.some((item) => !idsValidos.has(item.armadilhaId))) {
    return "Uma das armadilhas não pertence à propriedade atual.";
  }

  const data = new Date(dataStr);
  // Upsert (e não createMany) na chave única (armadilhaId, data): reabrir a grade
  // de uma data já lançada corrige a leitura existente em vez de duplicá-la —
  // duplicatas fariam a média do ponto dividir pelo número errado de armadilhas.
  await db.$transaction(
    itens.map((item) =>
      db.leituraArmadilha.upsert({
        where: { armadilhaId_data: { armadilhaId: item.armadilhaId, data } },
        update: { quantidade: Number(item.quantidadeRaw) },
        create: { armadilhaId: item.armadilhaId, data, quantidade: Number(item.quantidadeRaw) },
      }),
    ),
  );

  revalidatePath("/monitoramento-pragas");
  redirect(`/monitoramento-pragas?tipoPraga=${tipoPragaRaw}&safra=${encodeURIComponent(safra)}`);
}

// --- Leitura individual (edição/exclusão) -----------------------------------

export async function atualizarLeituraArmadilha(
  leituraId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dataStr = String(formData.get("data") ?? "");
  const quantidadeRaw = formData.get("quantidade");

  if (!dataStr || !quantidadeRaw || !Number.isInteger(Number(quantidadeRaw)) || Number(quantidadeRaw) < 0) {
    return "Informe a data e uma quantidade válida (número inteiro não negativo).";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirLeituraDaPropriedade(leituraId, propriedadeId))) return "Leitura inválida.";

  const data = new Date(dataStr);

  // Cada armadilha só pode ter uma leitura por data (restrição única no banco):
  // mudar a data desta leitura para uma já registrada da mesma armadilha daria
  // erro do Prisma — aqui vira mensagem amigável.
  const atual = await db.leituraArmadilha.findUniqueOrThrow({
    where: { id: leituraId },
    select: { armadilhaId: true },
  });
  const colidente = await db.leituraArmadilha.findFirst({
    where: { armadilhaId: atual.armadilhaId, data, NOT: { id: leituraId } },
    select: { id: true },
  });
  if (colidente) return "Já existe uma leitura dessa armadilha nessa data.";

  const leitura = await db.leituraArmadilha.update({
    where: { id: leituraId },
    data: { data, quantidade: Number(quantidadeRaw) },
    select: { armadilha: { select: { pontoMonitoramentoId: true } } },
  });

  revalidatePath(`/monitoramento-pragas/pontos/${leitura.armadilha.pontoMonitoramentoId}`);
  revalidatePath("/monitoramento-pragas");
  redirect(`/monitoramento-pragas/pontos/${leitura.armadilha.pontoMonitoramentoId}`);
}

export async function excluirLeituraArmadilha(leituraId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirLeituraDaPropriedade(leituraId, propriedadeId))) return;

  const leitura = await db.leituraArmadilha.delete({
    where: { id: leituraId },
    select: { armadilha: { select: { pontoMonitoramentoId: true } } },
  });

  revalidatePath(`/monitoramento-pragas/pontos/${leitura.armadilha.pontoMonitoramentoId}`);
  revalidatePath("/monitoramento-pragas");
  redirect(`/monitoramento-pragas/pontos/${leitura.armadilha.pontoMonitoramentoId}`);
}
