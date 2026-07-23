import { db } from "@/lib/db";
import { TIPO_OPERACAO_LABELS } from "@/lib/operacoes";

export type TipoItemHistorico = "tratamento" | "atividade" | "foto" | "visita" | "manutencao";

export type ItemHistorico = {
  id: string;
  data: Date;
  tipo: TipoItemHistorico;
  titulo: string;
  subtitulo?: string;
  href?: string;
  talhaoNome?: string;
  fotos?: string[];
};

const ICONE_POR_TIPO: Record<TipoItemHistorico, string> = {
  tratamento: "🚜",
  atividade: "🕒",
  foto: "📷",
  visita: "🌡️",
  manutencao: "🔧",
};

export function iconeItemHistorico(tipo: TipoItemHistorico) {
  return ICONE_POR_TIPO[tipo];
}

export type FiltroHistorico = {
  talhaoId?: string;
  propriedadeId?: string;
  mes?: number;
  ano?: number;
};

function montarWhere(filtro?: FiltroHistorico) {
  const escopo = filtro?.talhaoId
    ? { talhaoId: filtro.talhaoId }
    : filtro?.propriedadeId
      ? { talhao: { propriedadeId: filtro.propriedadeId } }
      : {};

  // Mês+ano juntos evitam misturar "março" de anos diferentes numa mesma consulta.
  const periodo =
    filtro?.mes && filtro?.ano
      ? {
          data: {
            gte: new Date(Date.UTC(filtro.ano, filtro.mes - 1, 1)),
            lt: new Date(Date.UTC(filtro.ano, filtro.mes, 1)),
          },
        }
      : {};

  return { ...escopo, ...periodo };
}

function mapearVisita(visita: {
  id: string;
  data: Date;
  temperatura: { toString(): string } | null;
  percentualEnfolhamento: number | null;
  observacoes: string | null;
  talhao: { nomeCodinome: string };
  fotos: { url: string }[];
}): ItemHistorico {
  const detalhes = [
    visita.temperatura ? `${visita.temperatura.toString()}°C` : null,
    visita.percentualEnfolhamento != null ? `${visita.percentualEnfolhamento}% de folhas` : null,
    visita.observacoes,
  ].filter(Boolean);

  return {
    id: `visita-${visita.id}`,
    data: visita.data,
    tipo: "visita",
    titulo: "Visita de campo",
    subtitulo: detalhes.join(" · ") || undefined,
    href: `/historico-pomar/${visita.id}`,
    talhaoNome: visita.talhao.nomeCodinome,
    fotos: visita.fotos.map((f) => f.url),
  };
}

/** Histórico do Pomar: só as visitas de campo (diário de campo) — data, fotos e observações. */
export async function buscarVisitas(
  filtro?: FiltroHistorico,
  paginacao?: { pagina: number; porPagina: number },
): Promise<{ itens: ItemHistorico[]; total: number }> {
  const where = montarWhere(filtro);

  const [visitas, total] = await Promise.all([
    db.visitaCampo.findMany({
      where,
      orderBy: { data: "desc" },
      include: { talhao: true, fotos: true },
      ...(paginacao
        ? { skip: (paginacao.pagina - 1) * paginacao.porPagina, take: paginacao.porPagina }
        : {}),
    }),
    db.visitaCampo.count({ where }),
  ]);

  return { itens: visitas.map(mapearVisita), total };
}

/**
 * Histórico do talhão: não existe uma tabela própria — é a junção, ordenada por
 * data, de tudo que já referencia o talhão (tratamentos, atividades, fotos,
 * visitas de campo). Uma informação cadastrada em qualquer módulo aparece aqui
 * automaticamente, sem duplicar dados. Usado na ficha do talhão (visão completa) —
 * o Histórico do Pomar usa `buscarVisitas` (só visitas).
 */
export async function buscarHistorico(filtro?: FiltroHistorico): Promise<ItemHistorico[]> {
  const where = montarWhere(filtro);

  const [operacoes, atividades, fotos, visitas] = await Promise.all([
    db.operacaoAgricola.findMany({
      where,
      orderBy: { data: "desc" },
      include: { produtos: { include: { produto: true } }, talhao: true },
    }),
    db.atividade.findMany({
      where,
      orderBy: { data: "desc" },
      include: { tipoAtividade: true, talhao: true },
    }),
    db.foto.findMany({
      where: { ...where, visitaCampoId: null },
      orderBy: { data: "desc" },
      include: { talhao: true },
    }),
    db.visitaCampo.findMany({
      where,
      orderBy: { data: "desc" },
      include: { talhao: true, fotos: true },
    }),
  ]);

  const itensOperacoes: ItemHistorico[] = operacoes.map((op) => ({
    id: `tratamento-${op.id}`,
    data: op.data,
    tipo: "tratamento",
    titulo: TIPO_OPERACAO_LABELS[op.tipo],
    subtitulo: op.produtos.map((item) => item.produto.nome).join(", ") || undefined,
    href: `/tratamentos/${op.id}`,
    talhaoNome: op.talhao.nomeCodinome,
  }));

  const itensAtividades: ItemHistorico[] = atividades.map((at) => ({
    id: `atividade-${at.id}`,
    data: at.data,
    tipo: "atividade",
    titulo: at.tipoAtividade.nome,
    subtitulo: at.observacoes ?? undefined,
    href: `/atividades/${at.id}`,
    talhaoNome: at.talhao.nomeCodinome,
  }));

  const itensFotos: ItemHistorico[] = fotos
    .filter((foto) => foto.talhaoId)
    .map((foto) => ({
      id: `foto-${foto.id}`,
      data: foto.data,
      tipo: "foto",
      titulo: "Foto",
      subtitulo: foto.descricao ?? undefined,
      talhaoNome: foto.talhao?.nomeCodinome,
      fotos: [foto.url],
    }));

  const itensVisitas: ItemHistorico[] = visitas.map(mapearVisita);

  return [...itensOperacoes, ...itensAtividades, ...itensFotos, ...itensVisitas].sort(
    (a, b) => b.data.getTime() - a.data.getTime(),
  );
}
