"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual, garantirContagemFrutosDaPropriedade } from "@/lib/propriedade";

function lerFormularioContagem(formData: FormData) {
  return {
    talhaoId: String(formData.get("talhaoId") ?? ""),
    safra: String(formData.get("safra") ?? "").trim(),
    dataStr: String(formData.get("data") ?? ""),
    metaFrutosPorPlantaRaw: formData.get("metaFrutosPorPlanta"),
    numeroPlantasAmostradasRaw: formData.get("numeroPlantasAmostradas"),
    frutosContadosRaw: formData.get("frutosContados"),
    areaHaRaw: formData.get("areaHa"),
    plantasPorHectareRaw: formData.get("plantasPorHectare"),
    pesoMedioFrutoGRaw: formData.get("pesoMedioFrutoG"),
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

function validarContagem(dados: ReturnType<typeof lerFormularioContagem>) {
  if (
    !dados.talhaoId ||
    !dados.safra ||
    !dados.dataStr ||
    !dados.metaFrutosPorPlantaRaw ||
    !dados.numeroPlantasAmostradasRaw ||
    !dados.frutosContadosRaw ||
    !dados.areaHaRaw ||
    !dados.plantasPorHectareRaw ||
    !dados.pesoMedioFrutoGRaw
  ) {
    return "Preencha o talhão, a safra, a data e todos os campos de contagem.";
  }

  const camposNumericos = [
    dados.metaFrutosPorPlantaRaw,
    dados.numeroPlantasAmostradasRaw,
    dados.frutosContadosRaw,
    dados.areaHaRaw,
    dados.plantasPorHectareRaw,
    dados.pesoMedioFrutoGRaw,
  ];
  if (camposNumericos.some((valor) => !Number.isFinite(Number(valor)))) {
    return "Os campos de contagem devem conter apenas números.";
  }

  return undefined;
}

// Meta é única por talhão + safra: reaproveita a meta já definida para essa
// combinação (atualizando-a, se o valor enviado for diferente — o que reflete
// em todas as contagens do talhão nessa safra) ou cria uma nova.
async function resolverMetaSafra(talhaoId: string, safra: string, metaFrutosPorPlanta: number) {
  return db.metaSafra.upsert({
    where: { talhaoId_safra: { talhaoId, safra } },
    update: { metaFrutosPorPlanta },
    create: { talhaoId, safra, metaFrutosPorPlanta },
  });
}

export async function criarContagemFrutos(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioContagem(formData);
  const erro = validarContagem(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  const talhao = await db.talhao.findUnique({ where: { id: dados.talhaoId }, select: { propriedadeId: true } });
  if (!talhao || talhao.propriedadeId !== propriedadeId) {
    return "Talhão inválido para a propriedade atual.";
  }

  const metaSafra = await resolverMetaSafra(dados.talhaoId, dados.safra, Number(dados.metaFrutosPorPlantaRaw));

  const contagem = await db.contagemFrutos.create({
    data: {
      propriedadeId,
      talhaoId: dados.talhaoId,
      metaSafraId: metaSafra.id,
      data: new Date(dados.dataStr),
      numeroPlantasAmostradas: Number(dados.numeroPlantasAmostradasRaw),
      frutosContados: Number(dados.frutosContadosRaw),
      areaHa: Number(dados.areaHaRaw),
      plantasPorHectare: Number(dados.plantasPorHectareRaw),
      pesoMedioFrutoG: Number(dados.pesoMedioFrutoGRaw),
      observacoes: dados.observacoes,
    },
  });

  revalidatePath("/contagem-frutos");
  redirect(`/contagem-frutos/${contagem.id}`);
}

export async function atualizarContagemFrutos(
  contagemId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioContagem(formData);
  const erro = validarContagem(dados);
  if (erro) return erro;

  const propriedadeId = await exigirPropriedadeAtual();
  const talhao = await db.talhao.findUnique({ where: { id: dados.talhaoId }, select: { propriedadeId: true } });
  if (!talhao || talhao.propriedadeId !== propriedadeId) {
    return "Talhão inválido para a propriedade atual.";
  }

  const metaSafra = await resolverMetaSafra(dados.talhaoId, dados.safra, Number(dados.metaFrutosPorPlantaRaw));

  await db.contagemFrutos.update({
    where: { id: contagemId },
    data: {
      talhaoId: dados.talhaoId,
      metaSafraId: metaSafra.id,
      data: new Date(dados.dataStr),
      numeroPlantasAmostradas: Number(dados.numeroPlantasAmostradasRaw),
      frutosContados: Number(dados.frutosContadosRaw),
      areaHa: Number(dados.areaHaRaw),
      plantasPorHectare: Number(dados.plantasPorHectareRaw),
      pesoMedioFrutoG: Number(dados.pesoMedioFrutoGRaw),
      observacoes: dados.observacoes,
    },
  });

  revalidatePath("/contagem-frutos");
  revalidatePath(`/contagem-frutos/${contagemId}`);
  redirect(`/contagem-frutos/${contagemId}`);
}

export async function excluirContagemFrutos(contagemId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirContagemFrutosDaPropriedade(contagemId, propriedadeId))) return;

  await db.contagemFrutos.delete({ where: { id: contagemId } });
  revalidatePath("/contagem-frutos");
  redirect("/contagem-frutos");
}
