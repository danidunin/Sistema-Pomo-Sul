"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPropriedadeAtual, garantirChuvaDaPropriedade } from "@/lib/propriedade";

type DadosChuva = {
  dataStr: string;
  quantidadeMm: number;
  relacaoTratamentoDia: "ANTES" | "DEPOIS" | null;
  observacoes: string | null;
};

function lerFormularioChuva(formData: FormData): DadosChuva {
  const relacaoRaw = String(formData.get("relacaoTratamentoDia") ?? "");
  return {
    dataStr: String(formData.get("data") ?? ""),
    quantidadeMm: Number(formData.get("quantidadeMm")),
    relacaoTratamentoDia: relacaoRaw === "ANTES" ? "ANTES" : relacaoRaw === "DEPOIS" ? "DEPOIS" : null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

async function validarChuva(
  dados: ReturnType<typeof lerFormularioChuva>,
  propriedadeId: string,
): Promise<string | undefined> {
  if (!dados.dataStr) return "Informe a data da leitura.";
  if (!dados.quantidadeMm || dados.quantidadeMm <= 0) return "Informe uma quantidade em mm maior que zero.";

  if (!dados.relacaoTratamentoDia) {
    const coincide = await db.operacaoAgricola.findFirst({
      where: { tipo: "FITOSSANITARIO", data: new Date(dados.dataStr), talhao: { propriedadeId } },
      select: { id: true },
    });
    if (coincide) return "Informe se a chuva caiu antes ou depois do tratamento.";
  }

  return undefined;
}

export async function criarChuvaRegistro(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioChuva(formData);
  const propriedadeId = await exigirPropriedadeAtual();
  const erro = await validarChuva(dados, propriedadeId);
  if (erro) return erro;

  await db.chuvaRegistro.create({
    data: {
      propriedadeId,
      data: new Date(dados.dataStr),
      quantidadeMm: dados.quantidadeMm,
      relacaoTratamentoDia: dados.relacaoTratamentoDia,
      observacoes: dados.observacoes,
    },
  });

  revalidatePath("/chuva");
  revalidatePath("/tratamentos");
  redirect("/chuva");
}

export async function atualizarChuvaRegistro(
  chuvaId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = lerFormularioChuva(formData);
  const propriedadeId = await exigirPropriedadeAtual();
  const erro = await validarChuva(dados, propriedadeId);
  if (erro) return erro;

  if (!(await garantirChuvaDaPropriedade(chuvaId, propriedadeId))) {
    return "Leitura inválida para a propriedade atual.";
  }

  await db.chuvaRegistro.update({
    where: { id: chuvaId },
    data: {
      data: new Date(dados.dataStr),
      quantidadeMm: dados.quantidadeMm,
      relacaoTratamentoDia: dados.relacaoTratamentoDia,
      observacoes: dados.observacoes,
    },
  });

  revalidatePath("/chuva");
  revalidatePath("/tratamentos");
  redirect("/chuva");
}

export async function excluirChuvaRegistro(chuvaId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirChuvaDaPropriedade(chuvaId, propriedadeId))) return;

  await db.chuvaRegistro.delete({ where: { id: chuvaId } });
  revalidatePath("/chuva");
  revalidatePath("/tratamentos");
  redirect("/chuva");
}
