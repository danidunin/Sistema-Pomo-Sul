"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function atualizarFotoPrincipalMaquina(maquinaId: string, url: string) {
  await db.maquina.update({ where: { id: maquinaId }, data: { fotoUrl: url } });
  revalidatePath(`/maquinas/${maquinaId}`);
  revalidatePath("/maquinas");
}

export async function adicionarFotoVisita(visitaId: string, url: string) {
  await db.foto.create({
    data: { visitaCampoId: visitaId, url, data: new Date() },
  });
  revalidatePath(`/historico-pomar/${visitaId}`);
  revalidatePath("/historico-pomar");
}

export async function excluirFotoVisita(visitaId: string, fotoId: string) {
  await db.foto.delete({ where: { id: fotoId } });
  revalidatePath(`/historico-pomar/${visitaId}`);
  revalidatePath("/historico-pomar");
}
