import { db } from "@/lib/db";

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
