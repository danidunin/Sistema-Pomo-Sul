"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

  if (!nome) {
    return "Informe o nome da máquina.";
  }

  const maquina = await db.maquina.create({
    data: {
      nome,
      marca,
      modelo,
      ano: anoRaw ? Number(anoRaw) : null,
      horimetroAtual: horimetroRaw ? Number(horimetroRaw) : null,
      observacoes,
    },
  });

  revalidatePath("/maquinas");
  redirect(`/maquinas/${maquina.id}`);
}

export async function criarManutencao(
  maquinaId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dataStr = String(formData.get("data") ?? "");
  const servicoRealizado = String(formData.get("servicoRealizado") ?? "").trim();
  const pecasUtilizadas = String(formData.get("pecasUtilizadas") ?? "").trim() || null;
  const valorRaw = formData.get("valor");
  const horimetroRaw = formData.get("horimetro");
  const mecanico = String(formData.get("mecanico") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  if (!dataStr || !servicoRealizado) {
    return "Preencha a data e o serviço realizado.";
  }

  await db.$transaction(async (tx) => {
    await tx.manutencao.create({
      data: {
        maquinaId,
        data: new Date(dataStr),
        servicoRealizado,
        pecasUtilizadas,
        valor: valorRaw ? Number(valorRaw) : null,
        horimetro: horimetroRaw ? Number(horimetroRaw) : null,
        mecanico,
        observacoes,
      },
    });

    if (horimetroRaw) {
      await tx.maquina.update({
        where: { id: maquinaId },
        data: { horimetroAtual: Number(horimetroRaw) },
      });
    }
  });

  revalidatePath(`/maquinas/${maquinaId}`);
  redirect(`/maquinas/${maquinaId}`);
}
