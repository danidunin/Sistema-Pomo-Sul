"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual } from "@/lib/propriedade";

function parseOperadorForm(formData: FormData) {
  return {
    nomeCompleto: String(formData.get("nomeCompleto") ?? "").trim(),
    apelido: String(formData.get("apelido") ?? "").trim() || null,
    cpf: String(formData.get("cpf") ?? "").trim() || null,
    telefone: String(formData.get("telefone") ?? "").trim() || null,
    funcao: String(formData.get("funcao") ?? "").trim() || null,
    equipe: String(formData.get("equipe") ?? "").trim() || null,
    ativo: formData.get("ativo") === "on",
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    fotoUrl: String(formData.get("fotoUrl") ?? "").trim() || null,
  };
}

export async function criarOperador(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseOperadorForm(formData);

  if (!dados.nomeCompleto) {
    return "Informe o nome completo do operador.";
  }

  const propriedadeId = await exigirPropriedadeAtual();
  const operador = await db.operador.create({ data: { ...dados, propriedadeId } });

  revalidatePath("/operadores");
  redirect(`/operadores/${operador.id}`);
}

export async function atualizarOperador(
  operadorId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseOperadorForm(formData);

  if (!dados.nomeCompleto) {
    return "Informe o nome completo do operador.";
  }

  await db.operador.update({ where: { id: operadorId }, data: dados });

  revalidatePath("/operadores");
  revalidatePath(`/operadores/${operadorId}`);
  redirect(`/operadores/${operadorId}`);
}

export async function excluirOperador(operadorId: string) {
  await db.operador.delete({ where: { id: operadorId } });
  revalidatePath("/operadores");
  redirect("/operadores");
}
