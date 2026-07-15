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
