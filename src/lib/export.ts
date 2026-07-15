import ExcelJS from "exceljs";
import pdfMake from "pdfmake";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import path from "node:path";

export type ColunaRelatorio = { chave: string; titulo: string; largura?: number };
export type LinhaRelatorio = Record<string, string | number | null>;

const LINHA_CABECALHO = 3;

export async function gerarXlsx(
  titulo: string,
  colunas: ColunaRelatorio[],
  linhas: LinhaRelatorio[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet(titulo.slice(0, 31));

  planilha.columns = colunas.map((coluna) => ({
    key: coluna.chave,
    width: coluna.largura ?? 20,
  }));

  planilha.mergeCells(1, 1, 1, colunas.length);
  const celulaTitulo = planilha.getCell(1, 1);
  celulaTitulo.value = titulo;
  celulaTitulo.font = { bold: true, size: 14 };

  planilha.getRow(LINHA_CABECALHO).values = colunas.map((c) => c.titulo);
  planilha.getRow(LINHA_CABECALHO).font = { bold: true };

  for (const linha of linhas) {
    planilha.addRow(linha);
  }

  planilha.autoFilter = {
    from: { row: LINHA_CABECALHO, column: 1 },
    to: { row: LINHA_CABECALHO, column: colunas.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

const PASTA_FONTES = path.join(process.cwd(), "node_modules/pdfmake/build/fonts/Roboto");

pdfMake.setFonts({
  Roboto: {
    normal: path.join(PASTA_FONTES, "Roboto-Regular.ttf"),
    bold: path.join(PASTA_FONTES, "Roboto-Medium.ttf"),
    italics: path.join(PASTA_FONTES, "Roboto-Italic.ttf"),
    bolditalics: path.join(PASTA_FONTES, "Roboto-MediumItalic.ttf"),
  },
});

export async function gerarPdf(titulo: string, colunas: ColunaRelatorio[], linhas: LinhaRelatorio[]): Promise<Buffer> {
  const docDefinition: TDocumentDefinitions = {
    pageOrientation: colunas.length > 4 ? "landscape" : "portrait",
    content: [
      { text: "POMO SUL", style: "marca" },
      { text: titulo, style: "titulo" },
      {
        table: {
          headerRows: 1,
          widths: colunas.map(() => "*"),
          body: [
            colunas.map((c) => ({ text: c.titulo, style: "cabecalho" })),
            ...linhas.map((linha) => colunas.map((c) => String(linha[c.chave] ?? "—"))),
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? "#166534" : rowIndex % 2 === 0 ? "#f5f5f4" : null),
        },
      },
    ],
    styles: {
      marca: { fontSize: 10, color: "#737373", margin: [0, 0, 0, 2] },
      titulo: { fontSize: 16, bold: true, margin: [0, 0, 0, 12] },
      cabecalho: { bold: true, color: "#ffffff" },
    },
    defaultStyle: { fontSize: 9 },
  };

  return pdfMake.createPdf(docDefinition).getBuffer();
}
