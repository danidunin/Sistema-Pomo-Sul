"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual, garantirMaquinaDaPropriedade, garantirVisitaDaPropriedade } from "@/lib/propriedade";

export async function atualizarFotoPrincipalMaquina(maquinaId: string, url: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirMaquinaDaPropriedade(maquinaId, propriedadeId))) {
    throw new Error("Máquina inválida para a propriedade atual.");
  }

  await db.maquina.update({ where: { id: maquinaId }, data: { fotoUrl: url } });
  revalidatePath(`/maquinas/${maquinaId}`);
  revalidatePath("/maquinas");
}

export async function adicionarFotoVisita(visitaId: string, url: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirVisitaDaPropriedade(visitaId, propriedadeId))) {
    throw new Error("Visita inválida para a propriedade atual.");
  }

  await db.foto.create({
    data: { visitaCampoId: visitaId, url, data: new Date() },
  });
  revalidatePath(`/historico-pomar/${visitaId}`);
  revalidatePath("/historico-pomar");
}

export async function excluirFotoVisita(visitaId: string, fotoId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirVisitaDaPropriedade(visitaId, propriedadeId))) return;

  await db.foto.delete({ where: { id: fotoId } });
  revalidatePath(`/historico-pomar/${visitaId}`);
  revalidatePath("/historico-pomar");
}
