import { describe, expect, it } from "vitest";
import {
  corIndexadaParaHex,
  colunaParaNumero,
  celulaEstaNoIntervalo,
  corDeDestaque,
  desembrulharValorNumerico,
  ordenarRegrasPorPrioridade,
  resolverCorCelula,
  textoDeCelula,
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

// Formatos de célula conferidos no arquivo real: as colunas "Média" e "Soma 2 leit." são
// fórmula (`{ formula, result }`) ou fórmula compartilhada (`{ sharedFormula, result }`), e a
// planilha tem 2361 células de fórmula compartilhada sem resultado (fonte em branco).
describe("desembrulharValorNumerico", () => {
  it("passa direto um número literal, inclusive 0 e negativo", () => {
    expect(desembrulharValorNumerico(42)).toBe(42);
    expect(desembrulharValorNumerico(0)).toBe(0);
    expect(desembrulharValorNumerico(-3.5)).toBe(-3.5);
  });

  it("desembrulha o resultado numérico de uma fórmula e de uma fórmula compartilhada", () => {
    expect(desembrulharValorNumerico({ formula: "SUM(E10+F10+G10)/3", result: 25.5 })).toBe(25.5);
    expect(desembrulharValorNumerico({ sharedFormula: "U9", result: 89.2 })).toBe(89.2);
  });

  it("retorna null pra fórmula sem resultado em cache ou com resultado não numérico", () => {
    expect(desembrulharValorNumerico({ formula: "A1+A2" })).toBeNull();
    expect(desembrulharValorNumerico({ sharedFormula: "A1" })).toBeNull();
    expect(desembrulharValorNumerico({ formula: "A1/0", result: { error: "#DIV/0!" } })).toBeNull();
    expect(desembrulharValorNumerico({ formula: "TEXT(A1)", result: "abc" })).toBeNull();
    expect(desembrulharValorNumerico({ formula: "TODAY()", result: new Date(2026, 0, 1) })).toBeNull();
  });

  it("retorna null pra tudo que não é número", () => {
    expect(desembrulharValorNumerico(null)).toBeNull();
    expect(desembrulharValorNumerico(undefined)).toBeNull();
    expect(desembrulharValorNumerico("12")).toBeNull();
    expect(desembrulharValorNumerico(true)).toBeNull();
    expect(desembrulharValorNumerico(new Date(2026, 0, 1))).toBeNull();
    expect(desembrulharValorNumerico({ error: "#N/A" })).toBeNull();
    expect(desembrulharValorNumerico({ richText: [{ text: "3" }] })).toBeNull();
    expect(desembrulharValorNumerico({ text: "3", hyperlink: "http://x" })).toBeNull();
    expect(desembrulharValorNumerico(Number.NaN)).toBeNull();
    expect(desembrulharValorNumerico(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("textoDeCelula", () => {
  it("devolve texto e número direto", () => {
    expect(textoDeCelula("Grapholita molesta")).toBe("Grapholita molesta");
    expect(textoDeCelula(7)).toBe("7");
    expect(textoDeCelula(true)).toBe("true");
  });

  it("concatena os trechos de uma célula com rich text em vez de virar [object Object]", () => {
    const rico = { richText: [{ text: "Soma " }, { text: "2 leit." }] };
    expect(textoDeCelula(rico)).toBe("Soma 2 leit.");
    expect(textoDeCelula(rico)).not.toContain("[object Object]");
  });

  it("usa o texto visível de um hyperlink e o resultado em cache de uma fórmula", () => {
    expect(textoDeCelula({ text: "Planilha", hyperlink: "https://exemplo" })).toBe("Planilha");
    expect(textoDeCelula({ formula: 'CONCAT(A1," ",B1)', result: "Cydia 1" })).toBe("Cydia 1");
    expect(textoDeCelula({ formula: "COUNT(A:A)", result: 12 })).toBe("12");
  });

  it("vira string vazia pro que não tem texto de exibição", () => {
    expect(textoDeCelula(null)).toBe("");
    expect(textoDeCelula(undefined)).toBe("");
    expect(textoDeCelula({ error: "#REF!" })).toBe("");
    expect(textoDeCelula({ formula: "A1+A2" })).toBe("");
    expect(textoDeCelula(new Date(2026, 0, 1))).toBe("");
  });
});

// Caso real da aba "Lapinha": o bloco de priority 28-30 (limiares 20/10) aparece DEPOIS no
// documento que o bloco de priority 31-33 (limiares 0.5/0.3), e os dois cobrem AD8:AG8.
describe("ordenarRegrasPorPrioridade", () => {
  const base: Omit<RegraFormatacao, "operador"> = { ref: "AD8:AG8", valores: [20], corHex: "#FF0000" };

  it("ordena por priority crescente, não pela ordem do documento", () => {
    const regras: RegraFormatacao[] = [
      { ...base, operador: "greaterThanOrEqual", valores: [0.5], corHex: "#FF0000", prioridade: 31 },
      { ...base, operador: "greaterThanOrEqual", valores: [20], corHex: "#0000FF", prioridade: 28 },
    ];
    expect(ordenarRegrasPorPrioridade(regras).map((r) => r.prioridade)).toEqual([28, 31]);
    // e isso muda a cor resolvida: com 25, as duas regras batem; ganha a de priority menor.
    expect(resolverCorCelula(ordenarRegrasPorPrioridade(regras), 8, 30, 25)).toBe("#0000FF");
    expect(resolverCorCelula(regras, 8, 30, 25)).toBe("#FF0000"); // ordem do documento: errado
  });

  it("não muta a lista original", () => {
    const regras: RegraFormatacao[] = [
      { ...base, operador: "greaterThan", prioridade: 9 },
      { ...base, operador: "lessThan", prioridade: 1 },
    ];
    ordenarRegrasPorPrioridade(regras);
    expect(regras.map((r) => r.prioridade)).toEqual([9, 1]);
  });

  it("regra sem prioridade vai pro fim, sem quebrar o sort", () => {
    const regras: RegraFormatacao[] = [
      { ...base, operador: "greaterThan", prioridade: undefined },
      { ...base, operador: "between", valores: [15, 30], prioridade: 5 },
      { ...base, operador: "lessThan", prioridade: undefined },
    ];
    const ordenadas = ordenarRegrasPorPrioridade(regras);
    expect(ordenadas.map((r) => r.operador)).toEqual(["between", "greaterThan", "lessThan"]);
  });

  it("mantém a ordem do documento entre regras de mesma prioridade (sort estável)", () => {
    const regras: RegraFormatacao[] = [
      { ...base, operador: "greaterThan", prioridade: 7 },
      { ...base, operador: "between", valores: [15, 30], prioridade: 7 },
      { ...base, operador: "lessThan", prioridade: 7 },
    ];
    expect(ordenarRegrasPorPrioridade(regras).map((r) => r.operador)).toEqual([
      "greaterThan",
      "between",
      "lessThan",
    ]);
  });
});

describe("corDeDestaque", () => {
  it("mantém as cores que realmente destacam", () => {
    expect(corDeDestaque("#FF0000")).toBe("#FF0000");
    expect(corDeDestaque("#000080")).toBe("#000080");
  });

  it("trata preto como 'sem destaque' — é assim que a planilha escreve 'nível normal'", () => {
    expect(corDeDestaque("#000000")).toBeNull();
    expect(corDeDestaque("#000000".toLowerCase())).toBeNull();
  });

  it("null quando nenhuma regra bateu", () => {
    expect(corDeDestaque(null)).toBeNull();
  });
});
