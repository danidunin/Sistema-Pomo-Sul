import { describe, expect, it } from "vitest";
import {
  corIndexadaParaHex,
  colunaParaNumero,
  celulaEstaNoIntervalo,
  resolverCorCelula,
  type RegraFormatacao,
} from "@/lib/planilha-pragas";

describe("corIndexadaParaHex", () => {
  it("resolve as cores da paleta padrão do Excel usadas na planilha real", () => {
    // Confirmadas lendo o arquivo real com ExcelJS: index 8 = preto (nível baixo),
    // index 10 = vermelho (nível de controle), index 12/18 = azul (atenção).
    expect(corIndexadaParaHex(8)).toBe("#000000");
    expect(corIndexadaParaHex(10)).toBe("#FF0000");
    expect(corIndexadaParaHex(12)).toBe("#0000FF");
    expect(corIndexadaParaHex(18)).toBe("#000080");
  });

  it("retorna null para um índice fora da paleta ou undefined", () => {
    expect(corIndexadaParaHex(999)).toBeNull();
    expect(corIndexadaParaHex(undefined)).toBeNull();
  });
});

describe("colunaParaNumero", () => {
  it("converte letras de coluna do Excel pro número da coluna (A=1)", () => {
    expect(colunaParaNumero("A")).toBe(1);
    expect(colunaParaNumero("B")).toBe(2);
    expect(colunaParaNumero("Z")).toBe(26);
    expect(colunaParaNumero("AA")).toBe(27);
    expect(colunaParaNumero("AH")).toBe(34);
    expect(colunaParaNumero("CV")).toBe(100);
  });
});

describe("celulaEstaNoIntervalo", () => {
  it("reconhece uma célula dentro de um único intervalo", () => {
    expect(celulaEstaNoIntervalo("B6:B89", 10, 2)).toBe(true);
    expect(celulaEstaNoIntervalo("B6:B89", 5, 2)).toBe(false);
    expect(celulaEstaNoIntervalo("B6:B89", 10, 3)).toBe(false);
  });

  it("reconhece uma célula isolada (sem ':')", () => {
    expect(celulaEstaNoIntervalo("C20", 20, 3)).toBe(true);
    expect(celulaEstaNoIntervalo("C20", 21, 3)).toBe(false);
  });

  it("um ref real da planilha tem vários intervalos separados por espaço", () => {
    const ref = "B6:B89 D8:M89 O8:AH89 C9:C18";
    expect(celulaEstaNoIntervalo(ref, 10, 2)).toBe(true); // dentro de B6:B89
    expect(celulaEstaNoIntervalo(ref, 10, 5)).toBe(true); // dentro de D8:M89 (coluna 5 = E, dentro de D..M = 4..13)
    expect(celulaEstaNoIntervalo(ref, 15, 20)).toBe(true); // dentro de O8:AH89 (coluna 20 = T, dentro de O..AH = 15..34)
    expect(celulaEstaNoIntervalo(ref, 7, 3)).toBe(false); // linha 7 não está em nenhum dos intervalos
  });
});

// Regras e limiares confirmados lendo diretamente a planilha real (Pomo Sul,
// seção Grapholita molesta): maior que 30 = vermelho, entre 15 e 30 = azul,
// menor que 15 = sem cor (preto/padrão).
describe("resolverCorCelula", () => {
  const regrasGrapholita: RegraFormatacao[] = [
    { ref: "B6:B89 D8:M89 O8:AH89 C9:C18", operador: "greaterThan", valores: [30], corHex: "#FF0000" },
    { ref: "B6:B89 D8:M89 O8:AH89 C9:C18", operador: "between", valores: [15, 30], corHex: "#0000FF" },
    { ref: "B6:B89 D8:M89 O8:AH89 C9:C18", operador: "lessThan", valores: [15], corHex: "#000000" },
  ];

  it("aplica a primeira regra cuja condição bate com o valor", () => {
    expect(resolverCorCelula(regrasGrapholita, 10, 5, 35)).toBe("#FF0000"); // >30
    expect(resolverCorCelula(regrasGrapholita, 10, 5, 20)).toBe("#0000FF"); // entre 15 e 30
    expect(resolverCorCelula(regrasGrapholita, 10, 5, 5)).toBe("#000000"); // <15
  });

  it("nos limiares exatos: 30 não é 'greaterThan' (é o teto do between), 15 é o piso do between", () => {
    expect(resolverCorCelula(regrasGrapholita, 10, 5, 30)).toBe("#0000FF");
    expect(resolverCorCelula(regrasGrapholita, 10, 5, 15)).toBe("#0000FF");
  });

  it("retorna null se a célula não está em nenhum intervalo das regras", () => {
    expect(resolverCorCelula(regrasGrapholita, 999, 999, 50)).toBeNull();
  });

  it("regra MAD real (moscas-das-frutas): >=0.5 vermelho, 0.3-0.4 azul-marinho, <0.3 sem cor", () => {
    const regrasMad: RegraFormatacao[] = [
      { ref: "AI84:AI89", operador: "greaterThanOrEqual", valores: [0.5], corHex: "#FF0000" },
      { ref: "AI84:AI89", operador: "between", valores: [0.3, 0.4], corHex: "#000080" },
      { ref: "AI84:AI89", operador: "lessThan", valores: [0.3], corHex: "#000000" },
    ];
    expect(resolverCorCelula(regrasMad, 85, 35, 0.5)).toBe("#FF0000");
    expect(resolverCorCelula(regrasMad, 85, 35, 0.35)).toBe("#000080");
    expect(resolverCorCelula(regrasMad, 85, 35, 0.1)).toBe("#000000");
  });
});
