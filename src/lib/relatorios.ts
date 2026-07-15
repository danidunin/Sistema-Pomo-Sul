import { db } from "@/lib/db";
import type { TipoOperacao } from "@/generated/prisma/enums";
import { TIPO_OPERACAO_LABELS } from "@/lib/operacoes";

export type FiltrosRelatorio = {
  dataInicio?: string;
  dataFim?: string;
  talhaoId?: string;
  cultura?: string;
  tipoAtividadeId?: string;
  tipoTratamento?: TipoOperacao;
};

function filtroData(filtros: FiltrosRelatorio) {
  if (!filtros.dataInicio && !filtros.dataFim) return undefined;
  return {
    ...(filtros.dataInicio ? { gte: new Date(filtros.dataInicio) } : {}),
    ...(filtros.dataFim ? { lte: new Date(filtros.dataFim) } : {}),
  };
}

function filtroTalhao(filtros: FiltrosRelatorio, propriedadeId: string) {
  return {
    propriedadeId,
    ...(filtros.talhaoId ? { id: filtros.talhaoId } : {}),
    ...(filtros.cultura ? { especie: filtros.cultura } : {}),
  };
}

export type LinhaHorasMaquina = {
  id: string;
  data: Date;
  origem: "Atividade" | "Tratamento";
  descricao: string;
  talhao: string;
  horas: number;
};

export async function buscarHorasMaquina(propriedadeId: string, filtros: FiltrosRelatorio) {
  const data = filtroData(filtros);
  const talhao = filtroTalhao(filtros, propriedadeId);

  const [atividades, operacoes] = await Promise.all([
    db.atividade.findMany({
      where: {
        horasMaquina: { gt: 0 },
        talhao,
        ...(data ? { data } : {}),
        ...(filtros.tipoAtividadeId ? { tipoAtividadeId: filtros.tipoAtividadeId } : {}),
      },
      include: { talhao: true, tipoAtividade: true },
      orderBy: { data: "desc" },
    }),
    db.operacaoAgricola.findMany({
      where: {
        horasMaquina: { gt: 0 },
        talhao,
        ...(data ? { data } : {}),
        ...(filtros.tipoTratamento ? { tipo: filtros.tipoTratamento } : {}),
      },
      include: { talhao: true },
      orderBy: { data: "desc" },
    }),
  ]);

  const linhas: LinhaHorasMaquina[] = [
    ...atividades.map((a) => ({
      id: a.id,
      data: a.data,
      origem: "Atividade" as const,
      descricao: a.tipoAtividade.nome,
      talhao: a.talhao.nomeCodinome,
      horas: Number(a.horasMaquina),
    })),
    ...operacoes.map((o) => ({
      id: o.id,
      data: o.data,
      origem: "Tratamento" as const,
      descricao: TIPO_OPERACAO_LABELS[o.tipo],
      talhao: o.talhao.nomeCodinome,
      horas: Number(o.horasMaquina),
    })),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  const total = linhas.reduce((soma, l) => soma + l.horas, 0);

  return { linhas, total };
}

export type LinhaHorasHomem = {
  id: string;
  data: Date;
  origem: "Atividade" | "Tratamento";
  descricao: string;
  talhao: string;
  numeroPessoas: number;
  horasPorPessoa: number;
  horas: number;
};

export async function buscarHorasHomem(propriedadeId: string, filtros: FiltrosRelatorio) {
  const data = filtroData(filtros);
  const talhao = filtroTalhao(filtros, propriedadeId);

  const [atividades, operacoes] = await Promise.all([
    db.atividade.findMany({
      where: {
        talhao,
        ...(data ? { data } : {}),
        ...(filtros.tipoAtividadeId ? { tipoAtividadeId: filtros.tipoAtividadeId } : {}),
      },
      include: { talhao: true, tipoAtividade: true },
      orderBy: { data: "desc" },
    }),
    db.operacaoAgricola.findMany({
      where: {
        numeroPessoas: { not: null },
        talhao,
        ...(data ? { data } : {}),
        ...(filtros.tipoTratamento ? { tipo: filtros.tipoTratamento } : {}),
      },
      include: { talhao: true },
      orderBy: { data: "desc" },
    }),
  ]);

  const linhas: LinhaHorasHomem[] = [
    ...atividades.map((a) => ({
      id: a.id,
      data: a.data,
      origem: "Atividade" as const,
      descricao: a.tipoAtividade.nome,
      talhao: a.talhao.nomeCodinome,
      numeroPessoas: a.numeroPessoas,
      horasPorPessoa: Number(a.horasPorPessoa),
      horas: a.numeroPessoas * Number(a.horasPorPessoa),
    })),
    ...operacoes.map((o) => ({
      id: o.id,
      data: o.data,
      origem: "Tratamento" as const,
      descricao: TIPO_OPERACAO_LABELS[o.tipo],
      talhao: o.talhao.nomeCodinome,
      numeroPessoas: o.numeroPessoas!,
      horasPorPessoa: Number(o.horasPorPessoa),
      horas: o.numeroPessoas! * Number(o.horasPorPessoa),
    })),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  const total = linhas.reduce((soma, l) => soma + l.horas, 0);

  return { linhas, total };
}
