"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function criarAtividade(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const tipoAtividadeId = String(formData.get("tipoAtividadeId") ?? "");
  const talhaoId = String(formData.get("talhaoId") ?? "");
  const dataStr = String(formData.get("data") ?? "");
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  const usuarioIds = formData.getAll("usuarioId[]").map(String);
  const horas = formData.getAll("horas[]").map(Number);

  if (!tipoAtividadeId || !talhaoId || !dataStr) {
    return "Preencha o tipo de atividade, o talhão e a data.";
  }

  const funcionarios = usuarioIds
    .map((usuarioId, i) => ({ usuarioId, horasTrabalhadas: horas[i] }))
    .filter((item) => item.usuarioId && item.horasTrabalhadas > 0);

  if (funcionarios.length === 0) {
    return "Adicione ao menos um funcionário com horas trabalhadas maior que zero.";
  }

  const atividade = await db.$transaction(async (tx) => {
    const novaAtividade = await tx.atividade.create({
      data: {
        tipoAtividadeId,
        talhaoId,
        data: new Date(dataStr),
        observacoes,
      },
    });

    for (const funcionario of funcionarios) {
      await tx.atividadeFuncionario.create({
        data: {
          atividadeId: novaAtividade.id,
          usuarioId: funcionario.usuarioId,
          horasTrabalhadas: funcionario.horasTrabalhadas,
        },
      });
    }

    return novaAtividade;
  });

  revalidatePath("/atividades");
  revalidatePath(`/talhoes/${talhaoId}`);
  redirect(`/atividades/${atividade.id}`);
}
