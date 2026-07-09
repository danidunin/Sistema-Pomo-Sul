/**
 * Datas de campos "somente data" (ex: <input type="date">) são salvas como meia-noite UTC.
 * Formatar sempre com timeZone: "UTC" evita que o fuso local (America/Sao_Paulo) empurre
 * a data exibida um dia para trás.
 */
export function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
