"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  exigirPropriedadeAtual,
  garantirMaquinaDaPropriedade,
  garantirManutencaoDaPropriedade,
  garantirRevisaoDaPropriedade,
} from "@/lib/propriedade";
import { TipoConserto } from "@/generated/prisma/enums";
import { ehValorDoEnum } from "@/lib/enum";

function parseMaquinaForm(formData: FormData) {
  const anoRaw = formData.get("ano");
  const horimetroRaw = formData.get("horimetroAtual");
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    marca: String(formData.get("marca") ?? "").trim() || null,
    modelo: String(formData.get("modelo") ?? "").trim() || null,
    ano: anoRaw ? Number(anoRaw) : null,
    horimetroAtual: horimetroRaw ? Number(horimetroRaw) : null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    fotoUrl: String(formData.get("fotoUrl") ?? "").trim() || null,
  };
}

function validarNumerosMaquina(dados: ReturnType<typeof parseMaquinaForm>): string | undefined {
  if (
    (dados.ano !== null && !Number.isFinite(dados.ano)) ||
    (dados.horimetroAtual !== null && !Number.isFinite(dados.horimetroAtual))
  ) {
    return "Ano e horímetro devem conter apenas números.";
  }
  return undefined;
}

export async function criarMaquina(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseMaquinaForm(formData);

  if (!dados.nome) {
    return "Informe o nome da máquina.";
  }
  const erroNumeros = validarNumerosMaquina(dados);
  if (erroNumeros) return erroNumeros;

  const propriedadeId = await exigirPropriedadeAtual();
  const maquina = await db.maquina.create({ data: { ...dados, propriedadeId } });

  revalidatePath("/maquinas");
  redirect(`/maquinas/${maquina.id}`);
}

export async function atualizarMaquina(
  maquinaId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseMaquinaForm(formData);

  if (!dados.nome) {
    return "Informe o nome da máquina.";
  }
  const erroNumeros = validarNumerosMaquina(dados);
  if (erroNumeros) return erroNumeros;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirMaquinaDaPropriedade(maquinaId, propriedadeId))) {
    return "Máquina inválida para a propriedade atual.";
  }

  await db.maquina.update({ where: { id: maquinaId }, data: dados });

  revalidatePath("/maquinas");
  revalidatePath(`/maquinas/${maquinaId}`);
  redirect(`/maquinas/${maquinaId}`);
}

/**
 * Cadastro rápido (só o nome) usado pelo atalho "+ Nova máquina" dentro do
 * formulário de Tratamento — não redireciona, para não perder o formulário
 * de tratamento em andamento.
 */
export async function criarMaquinaRapido(
  nome: string,
): Promise<{ id: string; nome: string } | { erro: string }> {
  const nomeAparado = nome.trim();
  if (!nomeAparado) {
    return { erro: "Informe o nome da máquina." };
  }

  const propriedadeId = await exigirPropriedadeAtual();
  const maquina = await db.maquina.create({ data: { nome: nomeAparado, propriedadeId } });

  revalidatePath("/maquinas");
  return { id: maquina.id, nome: maquina.nome };
}

export async function excluirMaquina(maquinaId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirMaquinaDaPropriedade(maquinaId, propriedadeId))) return;

  // Manutenções, revisões e operações são histórico real que aconteceu com essa
  // máquina — apagar quebraria esses registros. Fotos são só ilustração da
  // própria máquina, então podem ser removidas junto sem perder nada.
  const [totalManutencoes, totalRevisoes, totalOperacoes] = await Promise.all([
    db.manutencao.count({ where: { maquinaId } }),
    db.revisao.count({ where: { maquinaId } }),
    db.operacaoAgricola.count({ where: { maquinaId } }),
  ]);

  if (totalManutencoes === 0 && totalRevisoes === 0 && totalOperacoes === 0) {
    await db.$transaction([
      db.foto.deleteMany({ where: { maquinaId } }),
      db.maquina.delete({ where: { id: maquinaId } }),
    ]);
    revalidatePath("/maquinas");
    redirect("/maquinas?resultado=excluida");
  } else {
    await db.maquina.update({ where: { id: maquinaId }, data: { ativo: false } });
    revalidatePath("/maquinas");
    redirect("/maquinas?resultado=inativada");
  }
}

function parseManutencaoForm(formData: FormData) {
  const valorRaw = formData.get("valor");
  return {
    dataStr: String(formData.get("data") ?? ""),
    servicoRealizado: String(formData.get("servicoRealizado") ?? "").trim(),
    tiposConserto: formData.getAll("tiposConserto[]").map(String) as TipoConserto[],
    pecasUtilizadas: String(formData.get("pecasUtilizadas") ?? "").trim() || null,
    valor: valorRaw ? Number(valorRaw) : null,
    mecanico: String(formData.get("mecanico") ?? "").trim() || null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    documentoUrls: formData.getAll("documentos[]").map(String),
    documentoNomes: formData.getAll("documentosNomes[]").map(String),
  };
}

function validarValorManutencao(dados: ReturnType<typeof parseManutencaoForm>): string | undefined {
  if (dados.valor !== null && !Number.isFinite(dados.valor)) {
    return "Valor deve conter apenas números.";
  }
  return undefined;
}

export async function criarManutencao(
  maquinaId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseManutencaoForm(formData);

  if (!dados.dataStr || !dados.servicoRealizado) {
    return "Preencha a data e o serviço realizado.";
  }
  if (dados.tiposConserto.some((tipo) => !ehValorDoEnum(TipoConserto, tipo))) {
    return "Tipo de conserto inválido.";
  }
  const erroValor = validarValorManutencao(dados);
  if (erroValor) return erroValor;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirMaquinaDaPropriedade(maquinaId, propriedadeId))) {
    return "Máquina inválida para a propriedade atual.";
  }

  await db.$transaction(async (tx) => {
    const manutencao = await tx.manutencao.create({
      data: {
        maquinaId,
        data: new Date(dados.dataStr),
        servicoRealizado: dados.servicoRealizado,
        tiposConserto: dados.tiposConserto,
        pecasUtilizadas: dados.pecasUtilizadas,
        valor: dados.valor,
        mecanico: dados.mecanico,
        observacoes: dados.observacoes,
      },
    });

    for (let i = 0; i < dados.documentoUrls.length; i++) {
      await tx.documentoManutencao.create({
        data: { manutencaoId: manutencao.id, url: dados.documentoUrls[i], nome: dados.documentoNomes[i] ?? "Documento" },
      });
    }
  });

  revalidatePath(`/maquinas/${maquinaId}`);
  redirect(`/maquinas/${maquinaId}`);
}

export async function atualizarManutencao(
  maquinaId: string,
  manutencaoId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseManutencaoForm(formData);

  if (!dados.dataStr || !dados.servicoRealizado) {
    return "Preencha a data e o serviço realizado.";
  }
  if (dados.tiposConserto.some((tipo) => !ehValorDoEnum(TipoConserto, tipo))) {
    return "Tipo de conserto inválido.";
  }
  const erroValor = validarValorManutencao(dados);
  if (erroValor) return erroValor;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirManutencaoDaPropriedade(manutencaoId, propriedadeId))) {
    return "Manutenção inválida para a propriedade atual.";
  }

  await db.$transaction(async (tx) => {
    await tx.manutencao.update({
      where: { id: manutencaoId },
      data: {
        data: new Date(dados.dataStr),
        servicoRealizado: dados.servicoRealizado,
        tiposConserto: dados.tiposConserto,
        pecasUtilizadas: dados.pecasUtilizadas,
        valor: dados.valor,
        mecanico: dados.mecanico,
        observacoes: dados.observacoes,
      },
    });

    for (let i = 0; i < dados.documentoUrls.length; i++) {
      await tx.documentoManutencao.create({
        data: { manutencaoId, url: dados.documentoUrls[i], nome: dados.documentoNomes[i] ?? "Documento" },
      });
    }
  });

  revalidatePath(`/maquinas/${maquinaId}`);
  redirect(`/maquinas/${maquinaId}`);
}

export async function excluirManutencao(maquinaId: string, manutencaoId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirManutencaoDaPropriedade(manutencaoId, propriedadeId))) return;

  await db.manutencao.delete({ where: { id: manutencaoId } });
  revalidatePath(`/maquinas/${maquinaId}`);
  redirect(`/maquinas/${maquinaId}`);
}

function parseRevisaoForm(formData: FormData) {
  return {
    dataStr: String(formData.get("data") ?? ""),
    servicoRealizado: String(formData.get("servicoRealizado") ?? "").trim(),
    horimetroRaw: formData.get("horimetro"),
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

function validarHorimetroRevisao(dados: ReturnType<typeof parseRevisaoForm>): string | undefined {
  if (!Number.isFinite(Number(dados.horimetroRaw))) {
    return "Horímetro deve conter apenas números.";
  }
  return undefined;
}

export async function criarRevisao(
  maquinaId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseRevisaoForm(formData);

  if (!dados.dataStr || !dados.servicoRealizado || !dados.horimetroRaw) {
    return "Preencha a data, o serviço realizado e o horímetro.";
  }
  const erroHorimetro = validarHorimetroRevisao(dados);
  if (erroHorimetro) return erroHorimetro;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirMaquinaDaPropriedade(maquinaId, propriedadeId))) {
    return "Máquina inválida para a propriedade atual.";
  }

  await db.$transaction([
    db.revisao.create({
      data: {
        maquinaId,
        data: new Date(dados.dataStr),
        servicoRealizado: dados.servicoRealizado,
        horimetro: Number(dados.horimetroRaw),
        observacoes: dados.observacoes,
      },
    }),
    db.maquina.update({
      where: { id: maquinaId },
      data: { horimetroAtual: Number(dados.horimetroRaw) },
    }),
  ]);

  revalidatePath(`/maquinas/${maquinaId}`);
  revalidatePath(`/maquinas/${maquinaId}/revisoes`);
  redirect(`/maquinas/${maquinaId}/revisoes`);
}

export async function atualizarRevisao(
  maquinaId: string,
  revisaoId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const dados = parseRevisaoForm(formData);

  if (!dados.dataStr || !dados.servicoRealizado || !dados.horimetroRaw) {
    return "Preencha a data, o serviço realizado e o horímetro.";
  }
  const erroHorimetro = validarHorimetroRevisao(dados);
  if (erroHorimetro) return erroHorimetro;

  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirRevisaoDaPropriedade(revisaoId, propriedadeId))) {
    return "Revisão inválida para a propriedade atual.";
  }

  await db.revisao.update({
    where: { id: revisaoId },
    data: {
      data: new Date(dados.dataStr),
      servicoRealizado: dados.servicoRealizado,
      horimetro: Number(dados.horimetroRaw),
      observacoes: dados.observacoes,
    },
  });

  revalidatePath(`/maquinas/${maquinaId}`);
  revalidatePath(`/maquinas/${maquinaId}/revisoes`);
  redirect(`/maquinas/${maquinaId}/revisoes`);
}

export async function excluirRevisao(maquinaId: string, revisaoId: string) {
  const propriedadeId = await exigirPropriedadeAtual();
  if (!(await garantirRevisaoDaPropriedade(revisaoId, propriedadeId))) return;

  await db.revisao.delete({ where: { id: revisaoId } });
  revalidatePath(`/maquinas/${maquinaId}`);
  revalidatePath(`/maquinas/${maquinaId}/revisoes`);
  redirect(`/maquinas/${maquinaId}/revisoes`);
}
