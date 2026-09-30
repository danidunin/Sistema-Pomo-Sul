export type ParPeso = { valor: number; peso: number };

/**
 * Média ponderada pelo peso de cada par — usada para agregar métricas de várias
 * contagens (ex: plantas amostradas) sem dar o mesmo peso a amostras pequenas e grandes.
 */
export function mediaPonderada(pares: ParPeso[]): number {
  const pesoTotal = pares.reduce((soma, p) => soma + p.peso, 0);
  if (pesoTotal === 0) return 0;
  return pares.reduce((soma, p) => soma + p.valor * p.peso, 0) / pesoTotal;
}

export type EntradaEstimativa = {
  metaFrutosPorPlanta: number;
  numeroPlantasAmostradas: number;
  frutosContados: number;
  areaHa: number;
  plantasPorHectare: number;
  pesoMedioFrutoG: number;
};

export type EstimativaSafra = {
  mediaFrutosPorPlanta: number;
  numeroTotalPlantas: number;
  estimativaTotalFrutos: number;
  estimativaSafraKg: number;
  produtividadeEstimadaKgHa: number;
};

/**
 * Calcula a estimativa de safra a partir de uma contagem de frutos amostrada.
 * Puro/sem efeitos colaterais — usado tanto no servidor (lista/detalhe) quanto
 * no cliente (pré-visualização ao vivo no formulário).
 */
export function calcularEstimativaSafra(entrada: EntradaEstimativa): EstimativaSafra {
  const mediaFrutosPorPlanta =
    entrada.numeroPlantasAmostradas > 0 ? entrada.frutosContados / entrada.numeroPlantasAmostradas : 0;
  const numeroTotalPlantas = entrada.areaHa * entrada.plantasPorHectare;
  const estimativaTotalFrutos = mediaFrutosPorPlanta * numeroTotalPlantas;
  const estimativaSafraKg = (estimativaTotalFrutos * entrada.pesoMedioFrutoG) / 1000;
  const produtividadeEstimadaKgHa = entrada.areaHa > 0 ? estimativaSafraKg / entrada.areaHa : 0;

  return {
    mediaFrutosPorPlanta,
    numeroTotalPlantas,
    estimativaTotalFrutos,
    estimativaSafraKg,
    produtividadeEstimadaKgHa,
  };
}

export type ContagemParaAgrupar = {
  talhaoId: string;
  talhaoNome: string;
  numeroPlantasTalhao: number | null;
  safra: string;
  metaFrutosPorPlanta: number;
  numeroPlantasAmostradas: number;
  frutosContados: number;
  plantasPorHectare: number;
  pesoMedioFrutoG: number;
  data: Date;
};

export type GrupoQuadraSafra = {
  talhaoId: string;
  talhaoNome: string;
  safra: string;
  metaFrutosPorPlanta: number;
  numeroContagens: number;
  dataUltimaContagem: Date;
  mediaFrutosPorPlanta: number;
  produtividadeEstimadaKgHa: number;
  totalPlantasAmostradas: number;
  numeroPlantasTalhao: number | null;
  percentualAmostrado: number | null;
};

/**
 * Agrupa contagens por talhão + safra e agrega os totais do grupo com a mesma fórmula
 * ponderada usada hoje na "Média consolidada" (page.tsx), só que por grupo em vez de sobre
 * a lista toda.
 */
export function agruparContagensPorQuadra(contagens: ContagemParaAgrupar[]): GrupoQuadraSafra[] {
  const grupos = new Map<string, ContagemParaAgrupar[]>();
  for (const c of contagens) {
    const chave = `${c.talhaoId}::${c.safra}`;
    const lista = grupos.get(chave);
    if (lista) lista.push(c);
    else grupos.set(chave, [c]);
  }

  return Array.from(grupos.values()).map((lista) => {
    const primeira = lista[0];
    const pesos = lista.map((c) => c.numeroPlantasAmostradas);

    const mediaFrutosPorPlanta = mediaPonderada(
      lista.map((c, i) => ({
        valor: c.numeroPlantasAmostradas > 0 ? c.frutosContados / c.numeroPlantasAmostradas : 0,
        peso: pesos[i],
      })),
    );
    const plantasPorHectareMedia = mediaPonderada(
      lista.map((c, i) => ({ valor: c.plantasPorHectare, peso: pesos[i] })),
    );
    const pesoMedioFrutoGMedia = mediaPonderada(
      lista.map((c, i) => ({ valor: c.pesoMedioFrutoG, peso: pesos[i] })),
    );
    const produtividadeEstimadaKgHa = (mediaFrutosPorPlanta * plantasPorHectareMedia * pesoMedioFrutoGMedia) / 1000;

    const totalPlantasAmostradas = lista.reduce((soma, c) => soma + c.numeroPlantasAmostradas, 0);
    const numeroPlantasTalhao = primeira.numeroPlantasTalhao;
    const percentualAmostrado =
      numeroPlantasTalhao != null && numeroPlantasTalhao > 0
        ? (totalPlantasAmostradas / numeroPlantasTalhao) * 100
        : null;

    const dataUltimaContagem = lista.reduce((max, c) => (c.data > max ? c.data : max), primeira.data);

    return {
      talhaoId: primeira.talhaoId,
      talhaoNome: primeira.talhaoNome,
      safra: primeira.safra,
      metaFrutosPorPlanta: primeira.metaFrutosPorPlanta,
      numeroContagens: lista.length,
      dataUltimaContagem,
      mediaFrutosPorPlanta,
      produtividadeEstimadaKgHa,
      totalPlantasAmostradas,
      numeroPlantasTalhao,
      percentualAmostrado,
    };
  });
}
