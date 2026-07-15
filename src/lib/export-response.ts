import { gerarXlsx, gerarPdf, type ColunaRelatorio, type LinhaRelatorio } from "@/lib/export";

export async function respostaRelatorio(
  formato: string | null,
  nomeArquivo: string,
  titulo: string,
  colunas: ColunaRelatorio[],
  linhas: LinhaRelatorio[],
) {
  if (formato === "pdf") {
    const buffer = await gerarPdf(titulo, colunas, linhas);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nomeArquivo}.pdf"`,
      },
    });
  }

  const buffer = await gerarXlsx(titulo, colunas, linhas);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeArquivo}.xlsx"`,
    },
  });
}
