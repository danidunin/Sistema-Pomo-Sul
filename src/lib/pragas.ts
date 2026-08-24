import type { TipoPraga } from "@/generated/prisma/enums";

export const TIPO_PRAGA_LABELS: Record<TipoPraga, string> = {
  GRAPHOLITA_MOLESTA: "Grapholita molesta",
  MOSCA_DAS_FRUTAS: "Moscas-das-frutas",
  BONAGOTA: "Bonagota (Lagarta Enroladeira)",
  CYDIA: "Cydia",
};

export type NivelControle = "BAIXO" | "ATENCAO" | "CONTROLE";

export const CORES_NIVEL: Record<NivelControle, { badge: string; texto: string }> = {
  BAIXO: { badge: "border-green-200 bg-green-50 text-green-800", texto: "Baixo" },
  ATENCAO: { badge: "border-amber-200 bg-amber-50 text-amber-800", texto: "Atenção" },
  CONTROLE: { badge: "border-red-200 bg-red-50 text-red-800", texto: "Nível de controle" },
};

type Limiares = { atencao: number; controle: number };

// Limiares replicados das fórmulas reais da planilha Monitoramento_2026-2027.xlsx
// (colunas "Soma 2 leit." e formatação condicional) e do valor oficial da
// Embrapa para Grapholita molesta (20/semana — ajustado do valor de 30 usado
// antes na planilha; decisão registrada na spec desta funcionalidade).
const LIMIARES_SOMA_SEMANA: Limiares = { atencao: 10, controle: 20 };
const LIMIARES_MAD: Limiares = { atencao: 0.3, controle: 0.5 };

function limiaresDaPraga(tipoPraga: TipoPraga): Limiares {
  return tipoPraga === "MOSCA_DAS_FRUTAS" ? LIMIARES_MAD : LIMIARES_SOMA_SEMANA;
}

export function avaliarNivelControle(tipoPraga: TipoPraga, metrica: number): NivelControle {
  const limiares = limiaresDaPraga(tipoPraga);
  if (metrica >= limiares.controle) return "CONTROLE";
  if (metrica >= limiares.atencao) return "ATENCAO";
  return "BAIXO";
}

/**
 * Média das quantidades das armadilhas do ponto numa mesma data.
 *
 * Divergência deliberada da planilha de origem: lá a fórmula é literalmente
 * `/N`, com N fixo no número de armadilhas do grupo, de modo que uma armadilha
 * deixada em branco no dia entra como zero e puxa a média para baixo. Aqui a
 * média divide apenas pelas armadilhas efetivamente preenchidas naquela data —
 * uma leitura pulada significa "não medido", não "capturou zero", e não deve
 * mascarar uma infestação real. Decisão confirmada com o produtor.
 */
export function mediaPonto(quantidades: number[]): number {
  if (quantidades.length === 0) return 0;
  return quantidades.reduce((soma, q) => soma + q, 0) / quantidades.length;
}

export type ArmadilhaLeituraBruta = { data: Date; quantidade: number };

/** Agrupa leituras de várias armadilhas do mesmo ponto por data e calcula a média de cada data. */
export function agruparMediaPorData(leituras: ArmadilhaLeituraBruta[]): { data: Date; media: number }[] {
  const porData = new Map<number, number[]>();
  for (const leitura of leituras) {
    const chave = leitura.data.getTime();
    porData.set(chave, [...(porData.get(chave) ?? []), leitura.quantidade]);
  }
  return Array.from(porData.entries())
    .map(([timestamp, quantidades]) => ({ data: new Date(timestamp), media: mediaPonto(quantidades) }))
    .sort((a, b) => a.data.getTime() - b.data.getTime());
}

export type LeituraPontoResumo = {
  data: Date;
  mediaAtual: number;
  metrica: number;
  nivel: NivelControle;
};

/**
 * Para Grapholita molesta, Bonagota e Cydia, a métrica é a soma da média atual
 * com a média da leitura anterior do mesmo ponto (equivalente semanal, já que
 * a leitura é ~2x/semana). Para Moscas-das-frutas é o MAD (Média de Moscas por
 * Armadilha por Dia): a mesma soma dividida por 7. Replica exatamente as
 * colunas "Soma 2 leit." da planilha original.
 */
export function metricaControle(tipoPraga: TipoPraga, mediaAtual: number, mediaAnterior: number | null): number {
  const soma = mediaAtual + (mediaAnterior ?? 0);
  return tipoPraga === "MOSCA_DAS_FRUTAS" ? soma / 7 : soma;
}

/**
 * A partir da série de médias por data de um ponto (ordem cronológica não é
 * exigida — a função ordena internamente), calcula a métrica de controle e o
 * nível de cada data, usando a leitura imediatamente anterior do mesmo ponto.
 */
export function calcularSerieNivelControle(
  tipoPraga: TipoPraga,
  leiturasPorData: { data: Date; media: number }[],
): LeituraPontoResumo[] {
  const ordenadas = [...leiturasPorData].sort((a, b) => a.data.getTime() - b.data.getTime());
  return ordenadas.map((atual, i) => {
    const anterior = i > 0 ? ordenadas[i - 1].media : null;
    const metrica = metricaControle(tipoPraga, atual.media, anterior);
    return { data: atual.data, mediaAtual: atual.media, metrica, nivel: avaliarNivelControle(tipoPraga, metrica) };
  });
}

/** Status do ponto na leitura mais recente — null se o ponto ainda não tem nenhuma leitura. */
export function statusAtualPonto(tipoPraga: TipoPraga, leiturasBrutas: ArmadilhaLeituraBruta[]): LeituraPontoResumo | null {
  const porData = agruparMediaPorData(leiturasBrutas);
  const serie = calcularSerieNivelControle(tipoPraga, porData);
  return serie.at(-1) ?? null;
}

// ---------------------------------------------------------------------------
// Grade estilo planilha — a mesma divisão e leiaute da Excel original: uma
// linha por data, uma coluna por armadilha agrupada sob o nome do ponto, com
// uma coluna "Média" colorida por nível de controle ao final de cada grupo.
// ---------------------------------------------------------------------------

export type ColunaArmadilhaGrade = { id: string; rotulo: string };
export type ColunaPontoGrade = {
  id: string;
  nome: string;
  /** Variedade do talhão das armadilhas do ponto — o cabeçalho do grupo na grade usa isto,
   * caindo para `nome` só quando o ponto ainda não tem nenhuma armadilha com talhão. Assume
   * um ponto por variedade (decisão do produtor): usa a variedade da primeira armadilha. */
  variedade: string | null;
  armadilhas: ColunaArmadilhaGrade[];
};
export type CelulaPontoGrade = { media: number; metrica: number; nivel: NivelControle } | null;
export type LinhaGrade = {
  data: Date;
  porArmadilha: Record<string, number | null>;
  porPonto: Record<string, CelulaPontoGrade>;
};
export type SecaoGrade = { tipoPraga: TipoPraga; pontos: ColunaPontoGrade[]; linhas: LinhaGrade[] };

/** Rótulo da coluna de métrica semanal — "Soma 2 leit." na planilha original, ou MAD para moscas-das-frutas. */
export function rotuloMetrica(tipoPraga: TipoPraga): string {
  return tipoPraga === "MOSCA_DAS_FRUTAS" ? "MAD" : "Soma 2 leit.";
}

type PontoParaGrade = {
  id: string;
  nome: string;
  tipoPraga: TipoPraga;
  armadilhas: {
    id: string;
    rotulo: string;
    talhao: { variedade: string | null };
    leituras: ArmadilhaLeituraBruta[];
  }[];
};

/**
 * Monta a grade de uma praga a partir dos pontos já carregados (com suas
 * armadilhas e leituras) — pura, sem acesso a banco, reaproveitando o mesmo
 * cálculo de nível de controle usado no resto do app (nenhuma lógica de média/
 * limiar é duplicada aqui).
 */
export function montarSecaoGrade(pontos: PontoParaGrade[]): SecaoGrade {
  const tipoPraga = pontos[0]?.tipoPraga ?? "GRAPHOLITA_MOLESTA";
  const colunasPontos: ColunaPontoGrade[] = pontos.map((p) => ({
    id: p.id,
    nome: p.nome,
    variedade: p.armadilhas[0]?.talhao.variedade ?? null,
    armadilhas: p.armadilhas.map((a) => ({ id: a.id, rotulo: a.rotulo })),
  }));

  const datas = new Set<number>();
  for (const ponto of pontos) {
    for (const armadilha of ponto.armadilhas) {
      for (const leitura of armadilha.leituras) datas.add(leitura.data.getTime());
    }
  }
  const timestamps = Array.from(datas).sort((a, b) => a - b);

  const seriePorPonto = new Map<string, Map<number, CelulaPontoGrade>>();
  for (const ponto of pontos) {
    const leiturasBrutas = ponto.armadilhas.flatMap((a) => a.leituras);
    const porData = agruparMediaPorData(leiturasBrutas);
    const serie = calcularSerieNivelControle(ponto.tipoPraga, porData);
    seriePorPonto.set(
      ponto.id,
      new Map(serie.map((s) => [s.data.getTime(), { media: s.mediaAtual, metrica: s.metrica, nivel: s.nivel }])),
    );
  }

  const linhas: LinhaGrade[] = timestamps.map((timestamp) => {
    const porArmadilha: Record<string, number | null> = {};
    for (const ponto of pontos) {
      for (const armadilha of ponto.armadilhas) {
        const leitura = armadilha.leituras.find((l) => l.data.getTime() === timestamp);
        porArmadilha[armadilha.id] = leitura ? leitura.quantidade : null;
      }
    }
    const porPonto: Record<string, CelulaPontoGrade> = {};
    for (const ponto of pontos) {
      porPonto[ponto.id] = seriePorPonto.get(ponto.id)?.get(timestamp) ?? null;
    }
    return { data: new Date(timestamp), porArmadilha, porPonto };
  });

  return { tipoPraga, pontos: colunasPontos, linhas };
}
