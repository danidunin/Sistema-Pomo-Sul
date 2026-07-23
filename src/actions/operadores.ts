"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual, garantirOperadorDaPropriedade } from "@/lib/propriedade";

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

/**
 * Cadastro rápido (só o nome) usado pelo atalho "+ Novo operador" dentro do
 * formulário de Tratamento — não redireciona, para não perder o formulário
 * de tratamento em andamento.
 */
export async function criarOperadorRapido(
  nome: string,
): Promise<{ id: string; nome: string } | { erro: string }> {
  const nomeCompleto = nome.trim();
  if (!nomeCompleto) {
    return { erro: "Informe o nome do operador." };
  }

  const propriedadeId = await exigirPropriedadeAtual();
  const operador = await db.operador.create({ data: { nomeCompleto, propriedadeId } });

  revalidatePath("/operadores");
  return { id: operador.id, nome: operador.nomeCompleto };
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

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirOperadorDaPropriedade(operadorId, propriedadeId))) {
    return "Operador inválido para a propriedade atual.";
  }

  await db.operador.update({ where: { id: operadorId }, data: dados });

  revalidatePath("/operadores");
  revalidatePath(`/operadores/${operadorId}`);
  redirect(`/operadores/${operadorId}`);
}

export async function excluirOperador(operadorId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirOperadorDaPropriedade(operadorId, propriedadeId))) return;

  // Só o uso em tratamentos (operacoes_agricolas) bloqueia a exclusão definitiva —
  // a FK é RESTRICT por padrão, então excluir um operador já usado em tratamento
  // quebraria esse histórico (ou lançaria um erro cru do Postgres). Mesmo critério
  // já usado em excluirProduto.
  const totalUsosEmOperacoes = await db.operacaoAgricola.count({ where: { operadorId } });

  if (totalUsosEmOperacoes === 0) {
    await db.operador.delete({ where: { id: operadorId } });
    revalidatePath("/operadores");
    redirect("/operadores?resultado=excluido");
  } else {
    await db.operador.update({ where: { id: operadorId }, data: { ativo: false } });
    revalidatePath("/operadores");
    revalidatePath(`/operadores/${operadorId}`);
    redirect("/operadores?resultado=inativado");
  }
}
