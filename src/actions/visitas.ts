"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual } from "@/lib/propriedade";

function lerFormularioVisita(formData: FormData) {
  const percentualRaw = String(formData.get("percentualEnfolhamento") ?? "");
  return {
    talhaoId: String(formData.get("talhaoId") ?? ""),
    dataStr: String(formData.get("data") ?? ""),
    temperaturaRaw: formData.get("temperatura"),
    percentualEnfolhamento: percentualRaw === "" ? null : Number(percentualRaw),
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

export async function criarVisitaCampo(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioVisita(formData);
  const fotoUrls = formData.getAll("fotos").map(String).filter(Boolean);

  if (!dados.talhaoId || !dados.dataStr) {
    return "Selecione o talhão e a data da visita.";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  const talhao = await db.talhao.findUnique({ where: { id: dados.talhaoId }, select: { propriedadeId: true } });
  if (!talhao || talhao.propriedadeId !== propriedadeId) {
    return "Talhão inválido para a propriedade atual.";
  }

  const novaVisita = await db.$transaction(async (tx) => {
    const visita = await tx.visitaCampo.create({
      data: {
        talhaoId: dados.talhaoId,
        data: new Date(dados.dataStr),
        temperatura: dados.temperaturaRaw ? Number(dados.temperaturaRaw) : null,
        percentualEnfolhamento: dados.percentualEnfolhamento,
        observacoes: dados.observacoes,
      },
    });

    for (const url of fotoUrls) {
      await tx.foto.create({
        data: { visitaCampoId: visita.id, url, data: new Date(dados.dataStr) },
      });
    }

    return visita;
  });

  revalidatePath("/historico-pomar");
  revalidatePath(`/talhoes/${dados.talhaoId}`);
  redirect(`/historico-pomar/${novaVisita.id}`);
}

export async function atualizarVisitaCampo(
  visitaId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioVisita(formData);

  if (!dados.talhaoId || !dados.dataStr) {
    return "Selecione o talhão e a data da visita.";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  const talhao = await db.talhao.findUnique({ where: { id: dados.talhaoId }, select: { propriedadeId: true } });
  if (!talhao || talhao.propriedadeId !== propriedadeId) {
    return "Talhão inválido para a propriedade atual.";
  }

  await db.visitaCampo.update({
    where: { id: visitaId },
    data: {
      talhaoId: dados.talhaoId,
      data: new Date(dados.dataStr),
      temperatura: dados.temperaturaRaw ? Number(dados.temperaturaRaw) : null,
      percentualEnfolhamento: dados.percentualEnfolhamento,
      observacoes: dados.observacoes,
    },
  });

  revalidatePath("/historico-pomar");
  revalidatePath(`/historico-pomar/${visitaId}`);
  revalidatePath(`/talhoes/${dados.talhaoId}`);
  redirect(`/historico-pomar/${visitaId}`);
}
