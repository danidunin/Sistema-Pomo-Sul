"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual, garantirAtividadeDaPropriedade } from "@/lib/propriedade";

function lerFormularioAtividade(formData: FormData) {
  const horasMaquinaRaw = formData.get("horasMaquina");
  const talhaoIdRaw = String(formData.get("talhaoId") ?? "").trim();

  return {
    tipoAtividadeId: String(formData.get("tipoAtividadeId") ?? ""),
    talhaoId: talhaoIdRaw || null,
    dataStr: String(formData.get("data") ?? ""),
    numeroPessoas: Number(formData.get("numeroPessoas") ?? 0),
    horasPorPessoa: Number(formData.get("horasPorPessoa") ?? 0),
    horasMaquina: horasMaquinaRaw ? Number(horasMaquinaRaw) : null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

async function validarAtividade(dados: ReturnType<typeof lerFormularioAtividade>): Promise<string | undefined> {
  if (!dados.tipoAtividadeId || !dados.dataStr) {
    return "Preencha o tipo de atividade e a data.";
  }
  if (!dados.numeroPessoas || dados.numeroPessoas < 1 || !dados.horasPorPessoa || dados.horasPorPessoa <= 0) {
    return "Informe a quantidade de pessoas e as horas por pessoa, maior que zero.";
  }
  if (dados.horasMaquina !== null && !Number.isFinite(dados.horasMaquina)) {
    return "Horas de máquina deve conter apenas números.";
  }

  const tipo = await db.tipoAtividade.findUnique({ where: { id: dados.tipoAtividadeId }, select: { nome: true } });
  if (!tipo) return "Tipo de atividade inválido.";
  if (tipo.nome !== "Chuva" && !dados.talhaoId) {
    return "Preencha o talhão.";
  }
  return undefined;
}

export async function criarAtividade(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioAtividade(formData);
  const erro = await validarAtividade(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  if (dados.talhaoId) {
    const talhao = await db.talhao.findUnique({ where: { id: dados.talhaoId }, select: { propriedadeId: true } });
    if (!talhao || talhao.propriedadeId !== propriedadeId) {
      return "Talhão inválido para a propriedade atual.";
    }
  }

  const atividade = await db.atividade.create({
    data: {
      tipoAtividadeId: dados.tipoAtividadeId,
      propriedadeId,
      talhaoId: dados.talhaoId,
      data: new Date(dados.dataStr),
      numeroPessoas: dados.numeroPessoas,
      horasPorPessoa: dados.horasPorPessoa,
      horasMaquina: dados.horasMaquina,
      observacoes: dados.observacoes,
    },
  });

  revalidatePath("/atividades");
  if (dados.talhaoId) revalidatePath(`/talhoes/${dados.talhaoId}`);
  redirect(`/atividades/${atividade.id}`);
}

export async function atualizarAtividade(
  atividadeId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioAtividade(formData);
  const erro = await validarAtividade(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirAtividadeDaPropriedade(atividadeId, propriedadeId))) {
    return "Atividade inválida para a propriedade atual.";
  }

  if (dados.talhaoId) {
    const talhao = await db.talhao.findUnique({ where: { id: dados.talhaoId }, select: { propriedadeId: true } });
    if (!talhao || talhao.propriedadeId !== propriedadeId) {
      return "Talhão inválido para a propriedade atual.";
    }
  }

  await db.atividade.update({
    where: { id: atividadeId },
    data: {
      tipoAtividadeId: dados.tipoAtividadeId,
      talhaoId: dados.talhaoId,
      data: new Date(dados.dataStr),
      numeroPessoas: dados.numeroPessoas,
      horasPorPessoa: dados.horasPorPessoa,
      horasMaquina: dados.horasMaquina,
      observacoes: dados.observacoes,
    },
  });

  revalidatePath("/atividades");
  revalidatePath(`/atividades/${atividadeId}`);
  if (dados.talhaoId) revalidatePath(`/talhoes/${dados.talhaoId}`);
  redirect(`/atividades/${atividadeId}`);
}

export async function excluirAtividade(atividadeId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  const atividade = await db.atividade.findUnique({
    where: { id: atividadeId },
    select: { talhaoId: true, propriedadeId: true },
  });
  if (!atividade || atividade.propriedadeId !== propriedadeId) return;

  await db.atividade.delete({ where: { id: atividadeId } });
  revalidatePath("/atividades");
  if (atividade.talhaoId) revalidatePath(`/talhoes/${atividade.talhaoId}`);
  redirect("/atividades");
}
