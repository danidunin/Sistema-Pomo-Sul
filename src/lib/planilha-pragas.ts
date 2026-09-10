// Paleta indexada padrão do Excel (ECMA-376/OOXML, tabela legada de 64 cores) —
// usada quando uma regra de formatação condicional referencia a cor por índice
// em vez de RGB direto. Fonte: tabela COLOR_INDEX do openpyxl (biblioteca de
// referência para leitura de .xlsx), conferida contra os índices reais
// encontrados na planilha desta propriedade (8, 10, 12, 18).
const PALETA_INDEXADA: Record<number, string> = {
  0: "#000000", 1: "#FFFFFF", 2: "#FF0000", 3: "#00FF00", 4: "#0000FF", 5: "#FFFF00",
  6: "#FF00FF", 7: "#00FFFF", 8: "#000000", 9: "#FFFFFF", 10: "#FF0000", 11: "#00FF00",
  12: "#0000FF", 13: "#FFFF00", 14: "#FF00FF", 15: "#00FFFF", 16: "#800000", 17: "#008000",
  18: "#000080", 19: "#808000", 20: "#800080", 21: "#008080", 22: "#C0C0C0", 23: "#808080",
  24: "#9999FF", 25: "#993366", 26: "#FFFFCC", 27: "#CCFFFF", 28: "#660066", 29: "#FF8080",
  30: "#0066CC", 31: "#CCCCFF", 32: "#000080", 33: "#FF00FF", 34: "#FFFF00", 35: "#00FFFF",
  36: "#800080", 37: "#800000", 38: "#008080", 39: "#0000FF", 40: "#00CCFF", 41: "#CCFFFF",
  42: "#CCFFCC", 43: "#FFFF99", 44: "#99CCFF", 45: "#FF99CC", 46: "#CC99FF", 47: "#FFCC99",
  48: "#3366FF", 49: "#33CCCC", 50: "#99CC00", 51: "#FFCC00", 52: "#FF9900", 53: "#FF6600",
  54: "#666699", 55: "#969696", 56: "#003366", 57: "#339966", 58: "#003300", 59: "#333300",
  60: "#993300", 61: "#993366", 62: "#333399", 63: "#333333",
};

export function corIndexadaParaHex(indexado: number | undefined): string | null {
  if (indexado === undefined) return null;
  return PALETA_INDEXADA[indexado] ?? null;
}

export type OperadorRegra = "greaterThan" | "greaterThanOrEqual" | "lessThan" | "lessThanOrEqual" | "between";

export type RegraFormatacao = {
  /** Um ou mais intervalos de célula separados por espaço, ex: "B6:B89 D8:M89" — é assim
   * que o Excel guarda uma regra aplicada a várias seleções não contíguas. */
  ref: string;
  operador: OperadorRegra;
  /** 1 valor para greaterThan/greaterThanOrEqual/lessThan/lessThanOrEqual, 2 para between. */
  valores: number[];
  corHex: string | null;
};

/** Converte uma referência de coluna estilo Excel ("B", "AH") pro número da coluna (A=1). */
export function colunaParaNumero(letras: string): number {
  let numero = 0;
  for (const letra of letras.toUpperCase()) {
    numero = numero * 26 + (letra.charCodeAt(0) - "A".charCodeAt(0) + 1);
  }
  return numero;
}

const REGEX_CELULA = /^([A-Z]+)(\d+)$/;

function celulaParaLinhaColuna(celula: string): { linha: number; coluna: number } | null {
  const m = REGEX_CELULA.exec(celula);
  if (!m) return null;
  return { linha: Number(m[2]), coluna: colunaParaNumero(m[1]) };
}

function intervaloContem(intervalo: string, linha: number, coluna: number): boolean {
  const [inicioStr, fimStr] = intervalo.split(":");
  const inicio = celulaParaLinhaColuna(inicioStr);
  const fim = fimStr ? celulaParaLinhaColuna(fimStr) : inicio;
  if (!inicio || !fim) return false;
  return linha >= inicio.linha && linha <= fim.linha && coluna >= inicio.coluna && coluna <= fim.coluna;
}

/** `ref` pode ter vários intervalos separados por espaço. */
export function celulaEstaNoIntervalo(ref: string, linha: number, coluna: number): boolean {
  return ref.split(" ").some((intervalo) => intervaloContem(intervalo, linha, coluna));
}

function regraSeAplica(regra: RegraFormatacao, valor: number): boolean {
  switch (regra.operador) {
    case "greaterThan":
      return valor > regra.valores[0];
    case "greaterThanOrEqual":
      return valor >= regra.valores[0];
    case "lessThan":
      return valor < regra.valores[0];
    case "lessThanOrEqual":
      return valor <= regra.valores[0];
    case "between":
      return valor >= regra.valores[0] && valor <= regra.valores[1];
  }
}

/**
 * Resolve a cor de uma célula: a primeira regra (na ordem em que aparecem — o Excel já as
 * guarda em ordem de prioridade) cujo intervalo contém a célula E cuja condição bate com o
 * valor. Retorna null se nenhuma regra se aplica (célula sem cor especial).
 */
export function resolverCorCelula(
  regras: RegraFormatacao[],
  linha: number,
  coluna: number,
  valor: number,
): string | null {
  for (const regra of regras) {
    if (celulaEstaNoIntervalo(regra.ref, linha, coluna) && regraSeAplica(regra, valor)) {
      return regra.corHex;
    }
  }
  return null;
}
