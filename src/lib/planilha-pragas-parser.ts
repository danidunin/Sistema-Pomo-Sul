import type ExcelJS from "exceljs";
import { resolverCorCelula, corIndexadaParaHex, type RegraFormatacao } from "@/lib/planilha-pragas";

export type CelulaTabela = { valor: number | string | Date | null; corHex: string | null };
export type GrupoColuna = { rotulo: string; colSpan: number };
export type AbaTabela = {
  nome: string;
  cabecalhoGrupo: GrupoColuna[];
  cabecalhoColuna: string[];
  linhas: { celulas: CelulaTabela[] }[];
};

const LINHA_GRUPO = 6;
const LINHA_ROTULO = 7;
const LINHA_PRIMEIRA_LEITURA = 8;

function extrairRegras(planilha: ExcelJS.Worksheet): RegraFormatacao[] {
  const regras: RegraFormatacao[] = [];
  // `conditionalFormattings` existe em tempo de execução (ver node_modules/exceljs/lib/doc/worksheet.js)
  // mas não está declarado no .d.ts desta versão do exceljs — mesmo gap de tipo que `master` abaixo.
  const planilhaComFormatacoes = planilha as unknown as {
    conditionalFormattings?: ExcelJS.ConditionalFormattingOptions[];
  };
  for (const cf of planilhaComFormatacoes.conditionalFormattings ?? []) {
    for (const regra of cf.rules ?? []) {
      if (regra.type !== "cellIs" || !regra.operator || !regra.formulae) continue;
      const estilo = regra.style as { font?: { color?: { indexed?: number; argb?: string } } } | undefined;
      const cor = estilo?.font?.color;
      // argb vem como "AARRGGBB" (8 caracteres) — os 2 primeiros são o canal alpha, descartado.
      const corHex = cor?.argb ? `#${cor.argb.slice(2)}` : corIndexadaParaHex(cor?.indexed);
      regras.push({
        ref: cf.ref ?? "",
        operador: regra.operator as RegraFormatacao["operador"],
        valores: (regra.formulae as string[]).map(Number),
        corHex,
      });
    }
  }
  return regras;
}

/** Agrupa uma linha de cabeçalho (com possíveis merges) em colunas de colSpan — usado tanto
 * para células mescladas (o grupo todo compartilha o mesmo texto do canto superior esquerdo)
 * quanto para células soltas (cada uma vira seu próprio grupo de 1 coluna, com seu próprio
 * texto, mesmo que vazio — preserva o alinhamento visual com as colunas de dado abaixo). */
function agruparLinhaHeader(
  planilha: ExcelJS.Worksheet,
  linha: number,
  colunaInicio: number,
  colunaFim: number,
): GrupoColuna[] {
  const grupos: GrupoColuna[] = [];
  let coluna = colunaInicio;
  while (coluna <= colunaFim) {
    const celula = planilha.getCell(linha, coluna);
    const master = celula.isMerged ? (celula as unknown as { master: ExcelJS.Cell }).master : celula;
    const enderecoGrupo = master.address;
    let fimGrupo = coluna;
    while (fimGrupo + 1 <= colunaFim) {
      const proxima = planilha.getCell(linha, fimGrupo + 1);
      const masterProxima = proxima.isMerged ? (proxima as unknown as { master: ExcelJS.Cell }).master : proxima;
      if (masterProxima.address !== enderecoGrupo) break;
      fimGrupo++;
    }
    grupos.push({ rotulo: String(master.value ?? ""), colSpan: fimGrupo - coluna + 1 });
    coluna = fimGrupo + 1;
  }
  return grupos;
}

/** Uma aba conta como conteúdo real se tiver pelo menos a linha de primeira leitura e mais
 * de uma coluna — descarta abas vazias tipo "Plan3". */
function temConteudo(planilha: ExcelJS.Worksheet): boolean {
  return planilha.rowCount >= LINHA_PRIMEIRA_LEITURA && planilha.actualColumnCount > 1;
}

/** A primeira data da coluna A é um valor literal, mas as linhas seguintes usam fórmula
 * (ex: `=SOMA(A8+3)`) — o ExcelJS representa isso como `{ formula, result }` em vez de um
 * `Date` direto. Extrai a data em ambos os casos; retorna null pra qualquer outra coisa
 * (célula vazia, texto, etc.), o que preserva o filtro de linhas em branco. */
function extrairDataLeitura(valor: ExcelJS.CellValue): Date | null {
  if (valor instanceof Date) return valor;
  if (valor && typeof valor === "object" && "result" in valor && valor.result instanceof Date) {
    return valor.result;
  }
  return null;
}

export function parsearWorkbook(workbook: ExcelJS.Workbook): AbaTabela[] {
  const abas: AbaTabela[] = [];

  for (const planilha of workbook.worksheets) {
    if (!temConteudo(planilha)) continue;

    const regras = extrairRegras(planilha);
    const ultimaColuna = planilha.actualColumnCount;

    const cabecalhoColuna: string[] = [];
    for (let coluna = 2; coluna <= ultimaColuna; coluna++) {
      cabecalhoColuna.push(String(planilha.getCell(LINHA_ROTULO, coluna).value ?? ""));
    }

    const cabecalhoGrupo = agruparLinhaHeader(planilha, LINHA_GRUPO, 2, ultimaColuna);

    const linhas: { celulas: CelulaTabela[] }[] = [];
    for (let linha = LINHA_PRIMEIRA_LEITURA; linha <= planilha.rowCount; linha++) {
      const dataLeitura = extrairDataLeitura(planilha.getCell(linha, 1).value);
      if (!dataLeitura) continue;

      const celulas: CelulaTabela[] = [{ valor: dataLeitura, corHex: null }];
      for (let coluna = 2; coluna <= ultimaColuna; coluna++) {
        const bruto = planilha.getCell(linha, coluna).value;
        const valor = typeof bruto === "number" ? bruto : null;
        celulas.push({
          valor,
          corHex: valor !== null ? resolverCorCelula(regras, linha, coluna, valor) : null,
        });
      }
      linhas.push({ celulas });
    }

    abas.push({ nome: planilha.name, cabecalhoGrupo, cabecalhoColuna, linhas });
  }

  return abas;
}
