"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import type { TipoConserto } from "@/generated/prisma/enums";

export async function criarMaquina(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const nome = String(formData.get("nome") ?? "").trim();
  const marca = String(formData.get("marca") ?? "").trim() || null;
  const modelo = String(formData.get("modelo") ?? "").trim() || null;
  const anoRaw = formData.get("ano");
  const horimetroRaw = formData.get("horimetroAtual");
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const fotoUrl = String(formData.get("fotoUrl") ?? "").trim() || null;

  if (!nome) {
    return "Informe o nome da máquina.";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  const maquina = await db.maquina.create({
    data: {
      propriedadeId,
      nome,
      marca,
      modelo,
      ano: anoRaw ? Number(anoRaw) : null,
      horimetroAtual: horimetroRaw ? Number(horimetroRaw) : null,
      observacoes,
      fotoUrl,
    },
  });

  revalidatePath("/maquinas");
  redirect(`/maquinas/${maquina.id}`);
}

function parseManutencaoForm(formData: FormData) {
  return {
    dataStr: String(formData.get("data") ?? ""),
    servicoRealizado: String(formData.get("servicoRealizado") ?? "").trim(),
    tiposConserto: formData.getAll("tiposConserto[]").map(String) as TipoConserto[],
    pecasUtilizadas: String(formData.get("pecasUtilizadas") ?? "").trim() || null,
    valorRaw: formData.get("valor"),
    mecanico: String(formData.get("mecanico") ?? "").trim() || null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    documentoUrls: formData.getAll("documentos[]").map(String),
    documentoNomes: formData.getAll("documentosNomes[]").map(String),
  };
}

export async function criarManutencao(
  maquinaId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseManutencaoForm(formData);

  if (!dados.dataStr || !dados.servicoRealizado) {
    return "Preencha a data e o serviço realizado.";
  }

  await db.$transaction(async (tx) => {
    const manutencao = await tx.manutencao.create({
      data: {
        maquinaId,
        data: new Date(dados.dataStr),
        servicoRealizado: dados.servicoRealizado,
        tiposConserto: dados.tiposConserto,
        pecasUtilizadas: dados.pecasUtilizadas,
        valor: dados.valorRaw ? Number(dados.valorRaw) : null,
        mecanico: dados.mecanico,
        observacoes: dados.observacoes,
      },
    });

    for (let i = 0; i < dados.documentoUrls.length; i++) {
      await tx.documentoManutencao.create({
        data: { manutencaoId: manutencao.id, url: dados.documentoUrls[i], nome: dados.documentoNomes[i] ?? "Documento" },
      });
    }
  });

  revalidatePath(`/maquinas/${maquinaId}`);
  redirect(`/maquinas/${maquinaId}`);
}

export async function atualizarManutencao(
  maquinaId: string,
  manutencaoId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseManutencaoForm(formData);

  if (!dados.dataStr || !dados.servicoRealizado) {
    return "Preencha a data e o serviço realizado.";
  }

  await db.$transaction(async (tx) => {
    await tx.manutencao.update({
      where: { id: manutencaoId },
      data: {
        data: new Date(dados.dataStr),
        servicoRealizado: dados.servicoRealizado,
        tiposConserto: dados.tiposConserto,
        pecasUtilizadas: dados.pecasUtilizadas,
        valor: dados.valorRaw ? Number(dados.valorRaw) : null,
        mecanico: dados.mecanico,
        observacoes: dados.observacoes,
      },
    });

    for (let i = 0; i < dados.documentoUrls.length; i++) {
      await tx.documentoManutencao.create({
        data: { manutencaoId, url: dados.documentoUrls[i], nome: dados.documentoNomes[i] ?? "Documento" },
      });
    }
  });

  revalidatePath(`/maquinas/${maquinaId}`);
  redirect(`/maquinas/${maquinaId}`);
}

export async function excluirManutencao(maquinaId: string, manutencaoId: string) {
  await db.manutencao.delete({ where: { id: manutencaoId } });
  revalidatePath(`/maquinas/${maquinaId}`);
  redirect(`/maquinas/${maquinaId}`);
}

function parseRevisaoForm(formData: FormData) {
  return {
    dataStr: String(formData.get("data") ?? ""),
    servicoRealizado: String(formData.get("servicoRealizado") ?? "").trim(),
    horimetroRaw: formData.get("horimetro"),
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

export async function criarRevisao(
  maquinaId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseRevisaoForm(formData);

  if (!dados.dataStr || !dados.servicoRealizado || !dados.horimetroRaw) {
    return "Preencha a data, o serviço realizado e o horímetro.";
  }

  await db.$transaction([
    db.revisao.create({
      data: {
        maquinaId,
        data: new Date(dados.dataStr),
        servicoRealizado: dados.servicoRealizado,
        horimetro: Number(dados.horimetroRaw),
        observacoes: dados.observacoes,
      },
    }),
    db.maquina.update({
      where: { id: maquinaId },
      data: { horimetroAtual: Number(dados.horimetroRaw) },
    }),
  ]);

  revalidatePath(`/maquinas/${maquinaId}`);
  revalidatePath(`/maquinas/${maquinaId}/revisoes`);
  redirect(`/maquinas/${maquinaId}/revisoes`);
}

export async function atualizarRevisao(
  maquinaId: string,
  revisaoId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseRevisaoForm(formData);

  if (!dados.dataStr || !dados.servicoRealizado || !dados.horimetroRaw) {
    return "Preencha a data, o serviço realizado e o horímetro.";
  }

  await db.revisao.update({
    where: { id: revisaoId },
    data: {
      data: new Date(dados.dataStr),
      servicoRealizado: dados.servicoRealizado,
      horimetro: Number(dados.horimetroRaw),
      observacoes: dados.observacoes,
    },
  });

  revalidatePath(`/maquinas/${maquinaId}`);
  revalidatePath(`/maquinas/${maquinaId}/revisoes`);
  redirect(`/maquinas/${maquinaId}/revisoes`);
}

export async function excluirRevisao(maquinaId: string, revisaoId: string) {
  await db.revisao.delete({ where: { id: revisaoId } });
  revalidatePath(`/maquinas/${maquinaId}`);
  revalidatePath(`/maquinas/${maquinaId}/revisoes`);
  redirect(`/maquinas/${maquinaId}/revisoes`);
}
