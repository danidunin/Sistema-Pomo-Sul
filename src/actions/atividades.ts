"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual } from "@/lib/propriedade";

export async function criarAtividade(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const tipoAtividadeId = String(formData.get("tipoAtividadeId") ?? "");
  const talhaoId = String(formData.get("talhaoId") ?? "");
  const dataStr = String(formData.get("data") ?? "");
  const numeroPessoas = Number(formData.get("numeroPessoas") ?? 0);
  const horasPorPessoa = Number(formData.get("horasPorPessoa") ?? 0);
  const horasMaquinaRaw = formData.get("horasMaquina");
  const horasMaquina = horasMaquinaRaw ? Number(horasMaquinaRaw) : null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  if (!tipoAtividadeId || !talhaoId || !dataStr) {
    return "Preencha o tipo de atividade, o talhão e a data.";
  }

  if (!numeroPessoas || numeroPessoas < 1 || !horasPorPessoa || horasPorPessoa <= 0) {
    return "Informe a quantidade de pessoas e as horas por pessoa, maior que zero.";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  const talhao = await db.talhao.findUnique({ where: { id: talhaoId }, select: { propriedadeId: true } });
  if (!talhao || talhao.propriedadeId !== propriedadeId) {
    return "Talhão inválido para a propriedade atual.";
  }

  const atividade = await db.atividade.create({
    data: {
      tipoAtividadeId,
      talhaoId,
      data: new Date(dataStr),
      numeroPessoas,
      horasPorPessoa,
      horasMaquina,
      observacoes,
    },
  });

  revalidatePath("/atividades");
  revalidatePath(`/talhoes/${talhaoId}`);
  redirect(`/atividades/${atividade.id}`);
}
