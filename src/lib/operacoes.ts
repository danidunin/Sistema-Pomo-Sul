import type { TipoOperacao, UnidadeDosagem } from "@/generated/prisma/enums";

export const TIPO_OPERACAO_LABELS: Record<TipoOperacao, string> = {
  FITOSSANITARIO: "Tratamento fitossanitário",
  HERBICIDA: "Herbicida",
  ADUBACAO: "Adubação",
  OUTRA: "Outra",
};

/**
 * Adubação é aplicada no solo, sem calda: o operador informa apenas a dose em
 * kg/ha e o sistema multiplica pela área do talhão. Os demais tipos continuam
 * usando volume de calda e a unidade de dosagem cadastrada no produto.
 */
export function tipoUsaCalda(tipo: TipoOperacao): boolean {
  return tipo !== "ADUBACAO";
}

/**
 * Unidade de dosagem que vale para o item da operação. Em adubação é sempre
 * kg/ha (quantidade = dose × área do talhão), independente do que estiver
 * cadastrado no produto — fertilizantes normalmente entram no estoque sem
 * unidade de dosagem, porque só são dosados por área.
 *
 * Fonte única usada pelo formulário, pelo cálculo do servidor e pela exibição,
 * para os três nunca divergirem.
 */
export function unidadeDosagemEfetiva(
  tipo: TipoOperacao,
  unidadeDoProduto: UnidadeDosagem | null,
): UnidadeDosagem | null {
  return tipo === "ADUBACAO" ? "KG_HA" : unidadeDoProduto;
}
