import { db } from "@/lib/db";
import { cicloDaData } from "@/lib/ciclo";

export type StatusCelula = "SEM_APLICACAO" | "DENTRO_LIMITE" | "NO_LIMITE" | "ACIMA_LIMITE";

export function statusCelula(contagem: number, limite: number): StatusCelula {
  if (contagem === 0) return "SEM_APLICACAO";
  if (contagem < limite) return "DENTRO_LIMITE";
  if (contagem === limite) return "NO_LIMITE";
  return "ACIMA_LIMITE";
}

export type LinhaAplicacao = {
  operacaoId: string;
  produtoId: string;
  talhaoId: string;
  data: Date;
};

export type ContagemChave = {
  produtoId: string;
  limite: number;
  porTalhaoECiclo: Record<string, Record<string, number>>;
};

/**
 * Agrupa aplicações de produtos-chave por talhão e ciclo, contando operações distintas —
 * nunca soma de quantidade/volume. Deduplica por operação+produto, para o caso (raro) de
 * duas linhas do mesmo produto na mesma operação não contarem em dobro. Puro — sem acesso a
 * banco — para poder ser verificado isoladamente.
 */
export function agruparContagensPorTalhaoECiclo(
  linhas: LinhaAplicacao[],
  produtosChave: { id: string; limite: number }[],
): ContagemChave[] {
  const vistos = new Set<string>();
  const porProduto = new Map<string, Map<string, Map<string, number>>>();

  for (const linha of linhas) {
    const chaveUnica = `${linha.operacaoId}::${linha.produtoId}`;
    if (vistos.has(chaveUnica)) continue;
    vistos.add(chaveUnica);

    const cicloLabel = cicloDaData(linha.data).label;
    const porTalhao = porProduto.get(linha.produtoId) ?? new Map<string, Map<string, number>>();
    const porCiclo = porTalhao.get(linha.talhaoId) ?? new Map<string, number>();
    porCiclo.set(cicloLabel, (porCiclo.get(cicloLabel) ?? 0) + 1);
    porTalhao.set(linha.talhaoId, porCiclo);
    porProduto.set(linha.produtoId, porTalhao);
  }

  return produtosChave.map((produto) => {
    const porTalhao = porProduto.get(produto.id) ?? new Map<string, Map<string, number>>();
    return {
      produtoId: produto.id,
      limite: produto.limite,
      porTalhaoECiclo: Object.fromEntries(
        Array.from(porTalhao.entries()).map(([talhaoId, porCiclo]) => [
          talhaoId,
          Object.fromEntries(porCiclo),
        ]),
      ),
    };
  });
}

/** Ordena rótulos de ciclo ("2026/2027") do mais recente para o mais antigo, sem duplicar. */
export function ordenarCiclosDesc(labels: string[]): string[] {
  return Array.from(new Set(labels)).sort((a, b) => b.localeCompare(a));
}

/**
 * Busca, para a propriedade atual, a contagem de aplicações por talhão e ciclo de cada
 * produto-chave (limiteAplicacoesCiclo preenchido). Usada tanto pela tela-resumo quanto pelo
 * formulário de tratamento (que passa excluirOperacaoId no modo editar, para a operação
 * atual não se contar contra o próprio limite).
 */
export async function buscarContagensChaveParaFormulario(
  propriedadeId: string,
  excluirOperacaoId?: string,
): Promise<ContagemChave[]> {
  const produtosChave = await db.produto.findMany({
    where: { propriedadeId, ativo: true, limiteAplicacoesCiclo: { not: null } },
    select: { id: true, limiteAplicacoesCiclo: true },
  });
  if (produtosChave.length === 0) return [];

  const linhas = await db.operacaoProduto.findMany({
    where: {
      produtoId: { in: produtosChave.map((p) => p.id) },
      operacao: {
        talhao: { propriedadeId },
        ...(excluirOperacaoId ? { id: { not: excluirOperacaoId } } : {}),
      },
    },
    select: {
      produtoId: true,
      operacaoId: true,
      operacao: { select: { talhaoId: true, data: true } },
    },
  });

  return agruparContagensPorTalhaoECiclo(
    linhas.map((linha) => ({
      operacaoId: linha.operacaoId,
      produtoId: linha.produtoId,
      talhaoId: linha.operacao.talhaoId,
      data: linha.operacao.data,
    })),
    produtosChave.map((p) => ({ id: p.id, limite: p.limiteAplicacoesCiclo! })),
  );
}
