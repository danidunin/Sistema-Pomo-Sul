"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual } from "@/lib/propriedade";

function parseTalhaoForm(formData: FormData) {
  const nomeCodinome = String(formData.get("nomeCodinome") ?? "").trim();
  const areaHa = formData.get("areaHa");
  const anoPlantio = formData.get("anoPlantio");
  const numeroPlantas = formData.get("numeroPlantas");

  return {
    nomeCodinome,
    areaHa: areaHa ? Number(areaHa) : null,
    especie: String(formData.get("especie") ?? "").trim() || null,
    variedade: String(formData.get("variedade") ?? "").trim() || null,
    portaEnxerto: String(formData.get("portaEnxerto") ?? "").trim() || null,
    anoPlantio: anoPlantio ? Number(anoPlantio) : null,
    espacamento: String(formData.get("espacamento") ?? "").trim() || null,
    numeroPlantas: numeroPlantas ? Number(numeroPlantas) : null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

export async function criarTalhao(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseTalhaoForm(formData);

  if (!dados.nomeCodinome) {
    return "Informe o nome/codinome do talhão.";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  const talhao = await db.talhao.create({ data: { ...dados, propriedadeId } });

  revalidatePath("/talhoes");
  redirect(`/talhoes/${talhao.id}`);
}

export async function atualizarTalhao(
  talhaoId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseTalhaoForm(formData);

  if (!dados.nomeCodinome) {
    return "Informe o nome/codinome do talhão.";
  }

  await db.talhao.update({ where: { id: talhaoId }, data: dados });

  revalidatePath("/talhoes");
  revalidatePath(`/talhoes/${talhaoId}`);
  redirect(`/talhoes/${talhaoId}`);
}
