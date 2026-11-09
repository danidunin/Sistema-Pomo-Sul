import { db } from "@/lib/db";

export type ItemEstoqueConsolidadoPropriedade = {
  propriedadeId: string;
  propriedadeNome: string;
  quantidadeDisponivel: number;
};

export type ItemEstoqueConsolidadoUnidade = {
  unidade: string;
  totalDisponivel: number;
  porPropriedade: ItemEstoqueConsolidadoPropriedade[];
};

export type ItemEstoqueConsolidado = {
  nome: string;
  porUnidade: ItemEstoqueConsolidadoUnidade[];
};

/**
 * Agrupa o estoque de todas as propriedades por nome de produto (mesmo produto
 * comprado/usado em mais de uma fazenda deve somar, não aparecer duas vezes).
 * Separado por unidade dentro do mesmo nome, porque duas fazendas podem ter
 * cadastrado o mesmo produto em unidades diferentes — somar direto misturaria
 * litros com quilos sem avisar.
 */
export async function buscarEstoqueConsolidado(opts?: { apenasAtivos?: boolean }): Promise<ItemEstoqueConsolidado[]> {
  const produtos = await db.produto.findMany({
    where: opts?.apenasAtivos ? { ativo: true } : undefined,
    include: { propriedade: { select: { id: true, nome: true } } },
    orderBy: { nome: "asc" },
  });

  type GrupoUnidade = {
    unidade: string;
    totalDisponivel: number;
    porPropriedade: Map<string, ItemEstoqueConsolidadoPropriedade>;
  };
  type GrupoNome = { nomeExibicao: string; porUnidade: Map<string, GrupoUnidade> };

  const porNome = new Map<string, GrupoNome>();

  for (const produto of produtos) {
    const chaveNome = produto.nome.trim().toLowerCase();
    if (!porNome.has(chaveNome)) {
      porNome.set(chaveNome, { nomeExibicao: produto.nome.trim(), porUnidade: new Map() });
    }
    const grupoNome = porNome.get(chaveNome)!;

    const chaveUnidade = produto.unidade.trim().toLowerCase();
    if (!grupoNome.porUnidade.has(chaveUnidade)) {
      grupoNome.porUnidade.set(chaveUnidade, {
        unidade: produto.unidade.trim(),
        totalDisponivel: 0,
        porPropriedade: new Map(),
      });
    }
    const grupoUnidade = grupoNome.porUnidade.get(chaveUnidade)!;

    const quantidade = Number(produto.quantidadeDisponivel);
    grupoUnidade.totalDisponivel += quantidade;

    const existente = grupoUnidade.porPropriedade.get(produto.propriedadeId);
    if (existente) {
      existente.quantidadeDisponivel += quantidade;
    } else {
      grupoUnidade.porPropriedade.set(produto.propriedadeId, {
        propriedadeId: produto.propriedadeId,
        propriedadeNome: produto.propriedade.nome,
        quantidadeDisponivel: quantidade,
      });
    }
  }

  return Array.from(porNome.values())
    .map((grupo) => ({
      nome: grupo.nomeExibicao,
      porUnidade: Array.from(grupo.porUnidade.values())
        .map((u) => ({
          unidade: u.unidade,
          totalDisponivel: u.totalDisponivel,
          porPropriedade: Array.from(u.porPropriedade.values()).sort((a, b) =>
            a.propriedadeNome.localeCompare(b.propriedadeNome, "pt-BR"),
          ),
        }))
        .sort((a, b) => a.unidade.localeCompare(b.unidade, "pt-BR")),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
