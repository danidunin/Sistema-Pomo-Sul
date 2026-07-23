"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual } from "@/lib/propriedade";

function lerFormularioVisita(formData: FormData) {
  const percentualRaw = String(formData.get("percentualEnfolhamento") ?? "");
  const temperaturaRaw = formData.get("temperatura");
  return {
    talhaoId: String(formData.get("talhaoId") ?? ""),
    dataStr: String(formData.get("data") ?? ""),
    temperatura: temperaturaRaw ? Number(temperaturaRaw) : null,
    percentualEnfolhamento: percentualRaw === "" ? null : Number(percentualRaw),
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

function validarNumerosVisita(dados: ReturnType<typeof lerFormularioVisita>): string | undefined {
  const camposNumericos = [dados.temperatura, dados.percentualEnfolhamento];
  if (camposNumericos.some((valor) => valor !== null && !Number.isFinite(valor))) {
    return "Temperatura e percentual de enfolhamento devem conter apenas números.";
  }
  return undefined;
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
  const erroNumeros = validarNumerosVisita(dados);
  if (erroNumeros) return erroNumeros;

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
        temperatura: dados.temperatura,
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
  const erroNumeros = validarNumerosVisita(dados);
  if (erroNumeros) return erroNumeros;

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
      temperatura: dados.temperatura,
      percentualEnfolhamento: dados.percentualEnfolhamento,
      observacoes: dados.observacoes,
    },
  });

  revalidatePath("/historico-pomar");
  revalidatePath(`/historico-pomar/${visitaId}`);
  revalidatePath(`/talhoes/${dados.talhaoId}`);
  redirect(`/historico-pomar/${visitaId}`);
}
