import { db } from "@/lib/db";
import { statusAtualPonto, TIPO_PRAGA_LABELS } from "@/lib/pragas";
import type { TipoPraga } from "@/generated/prisma/enums";

export type ResumoPropriedade = {
  areaTotalHa: number;
  areaPorCultura: { cultura: string; areaHa: number }[];
  numeroTalhoes: number;
  numeroMaquinas: number;
  numeroFuncionarios: number;
  ultimaSincronizacao: Date | null;
};

export async function buscarResumoPropriedade(propriedadeId: string): Promise<ResumoPropriedade> {
  const [talhoes, numeroMaquinas, numeroFuncionarios, ultimosRegistros] = await Promise.all([
    db.talhao.findMany({ where: { propriedadeId }, select: { areaHa: true, especie: true, updatedAt: true } }),
    db.maquina.count({ where: { propriedadeId } }),
    db.operador.count({ where: { propriedadeId, ativo: true } }),
    Promise.all([
      db.talhao.findFirst({ where: { propriedadeId }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      db.operacaoAgricola.findFirst({
        where: { talhao: { propriedadeId } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      db.atividade.findFirst({
        where: { talhao: { propriedadeId } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      db.visitaCampo.findFirst({
        where: { talhao: { propriedadeId } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      db.estoqueMovimentacao.findFirst({
        where: { produto: { propriedadeId } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]),
  ]);

  const areaTotalHa = talhoes.reduce((soma, t) => soma + (t.areaHa ? Number(t.areaHa) : 0), 0);

  const porCultura = new Map<string, number>();
  for (const t of talhoes) {
    const cultura = t.especie?.trim() || "Sem espécie definida";
    porCultura.set(cultura, (porCultura.get(cultura) ?? 0) + (t.areaHa ? Number(t.areaHa) : 0));
  }

  const datas = ultimosRegistros
    .flatMap((r) => (r ? [("updatedAt" in r ? r.updatedAt : r.createdAt) as Date] : []))
    .sort((a, b) => b.getTime() - a.getTime());

  return {
    areaTotalHa,
    areaPorCultura: Array.from(porCultura.entries())
      .map(([cultura, areaHa]) => ({ cultura, areaHa }))
      .sort((a, b) => b.areaHa - a.areaHa),
    numeroTalhoes: talhoes.length,
    numeroMaquinas,
    numeroFuncionarios,
    ultimaSincronizacao: datas[0] ?? null,
  };
}

export type ResumoBasicoPropriedade = {
  id: string;
  nome: string;
  areaTotalHa: number;
  numeroTalhoes: number;
};

/** Mini-resumo por propriedade, usado no seletor da Home antes de escolher onde trabalhar. */
export async function buscarResumoBasicoPropriedades(): Promise<ResumoBasicoPropriedade[]> {
  const propriedades = await db.propriedade.findMany({
    orderBy: { nome: "asc" },
    include: { talhoes: { select: { areaHa: true } } },
  });

  return propriedades.map((p) => ({
    id: p.id,
    nome: p.nome,
    areaTotalHa: p.talhoes.reduce((soma, t) => soma + (t.areaHa ? Number(t.areaHa) : 0), 0),
    numeroTalhoes: p.talhoes.length,
  }));
}

export type AlertaPraga = {
  pontoId: string;
  pontoNome: string;
  talhoesNomes: string[];
  tipoPraga: TipoPraga;
  data: Date;
};

/** Pontos de monitoramento cuja leitura mais recente atingiu o nível de controle. */
export async function buscarAlertasPragas(propriedadeId: string): Promise<AlertaPraga[]> {
  const pontos = await db.pontoMonitoramento.findMany({
    where: { propriedadeId, ativo: true },
    include: {
      armadilhas: {
        where: { ativo: true },
        include: { leituras: true, talhao: { select: { nomeCodinome: true } } },
      },
    },
  });

  const alertas: AlertaPraga[] = [];
  for (const ponto of pontos) {
    const leiturasBrutas = ponto.armadilhas.flatMap((a) => a.leituras.map((l) => ({ data: l.data, quantidade: l.quantidade })));
    const status = statusAtualPonto(ponto.tipoPraga, leiturasBrutas);
    if (status?.nivel === "CONTROLE") {
      alertas.push({
        pontoId: ponto.id,
        pontoNome: ponto.nome,
        talhoesNomes: Array.from(new Set(ponto.armadilhas.map((a) => a.talhao.nomeCodinome))),
        tipoPraga: ponto.tipoPraga,
        data: status.data,
      });
    }
  }

  return alertas.sort((a, b) => b.data.getTime() - a.data.getTime());
}
