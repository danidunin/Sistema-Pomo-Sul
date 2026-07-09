import { db } from "@/lib/db";
import { TIPO_OPERACAO_LABELS } from "@/lib/operacoes";

export type ItemHistorico = {
  id: string;
  data: Date;
  titulo: string;
  subtitulo?: string;
  href?: string;
};

/**
 * Histórico do talhão: não existe uma tabela própria — é a junção, ordenada por data,
 * de tudo que já referencia esse talhão (operações, atividades, fotos). Uma informação
 * cadastrada em qualquer módulo aparece aqui automaticamente, sem duplicar dados.
 */
export async function buscarHistoricoTalhao(talhaoId: string): Promise<ItemHistorico[]> {
  const [operacoes, atividades, fotos] = await Promise.all([
    db.operacaoAgricola.findMany({
      where: { talhaoId },
      orderBy: { data: "desc" },
      include: { produtos: { include: { produto: true } } },
    }),
    db.atividade.findMany({
      where: { talhaoId },
      orderBy: { data: "desc" },
      include: { tipoAtividade: true },
    }),
    db.foto.findMany({
      where: { talhaoId },
      orderBy: { data: "desc" },
    }),
  ]);

  const itensOperacoes: ItemHistorico[] = operacoes.map((op) => ({
    id: `operacao-${op.id}`,
    data: op.data,
    titulo: TIPO_OPERACAO_LABELS[op.tipo],
    subtitulo: op.produtos.map((item) => item.produto.nome).join(", ") || undefined,
    href: `/operacoes/${op.id}`,
  }));

  const itensAtividades: ItemHistorico[] = atividades.map((at) => ({
    id: `atividade-${at.id}`,
    data: at.data,
    titulo: at.tipoAtividade.nome,
    subtitulo: at.observacoes ?? undefined,
    href: `/atividades/${at.id}`,
  }));

  const itensFotos: ItemHistorico[] = fotos.map((foto) => ({
    id: `foto-${foto.id}`,
    data: foto.data,
    titulo: "Foto",
    subtitulo: foto.descricao ?? undefined,
  }));

  return [...itensOperacoes, ...itensAtividades, ...itensFotos].sort(
    (a, b) => b.data.getTime() - a.data.getTime(),
  );
}
