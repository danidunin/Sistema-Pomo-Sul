"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual, garantirTalhaoDaPropriedade } from "@/lib/propriedade";

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

function validarNumerosTalhao(dados: ReturnType<typeof parseTalhaoForm>): string | undefined {
  const camposNumericos = [dados.areaHa, dados.anoPlantio, dados.numeroPlantas];
  if (camposNumericos.some((valor) => valor !== null && !Number.isFinite(valor))) {
    return "Área, ano de plantio e número de plantas devem conter apenas números.";
  }
  return undefined;
}

export async function criarTalhao(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseTalhaoForm(formData);

  if (!dados.nomeCodinome) {
    return "Informe o nome/codinome do talhão.";
  }
  const erroNumeros = validarNumerosTalhao(dados);
  if (erroNumeros) return erroNumeros;

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
  const erroNumeros = validarNumerosTalhao(dados);
  if (erroNumeros) return erroNumeros;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirTalhaoDaPropriedade(talhaoId, propriedadeId))) {
    return "Talhão inválido para a propriedade atual.";
  }

  await db.talhao.update({ where: { id: talhaoId }, data: dados });

  revalidatePath("/talhoes");
  revalidatePath(`/talhoes/${talhaoId}`);
  redirect(`/talhoes/${talhaoId}`);
}
