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

/** Média das quantidades de todas as armadilhas ativas do ponto numa mesma data. */
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
