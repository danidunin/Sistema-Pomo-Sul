import { describe, expect, it } from "vitest";
import {
  agruparProdutosExistentes,
  buscarParecidos,
  mesmoProduto,
  padronizarNomeProduto,
  pontuacaoParecido,
  unidadeDaLista,
} from "./produto-nome";

describe("padronizarNomeProduto", () => {
  it("passa para maiúsculo mantendo acentos", () => {
    expect(padronizarNomeProduto("Cloreto de Potássio")).toBe("CLORETO DE POTÁSSIO");
    expect(padronizarNomeProduto("Fitofós K plus")).toBe("FITOFÓS K PLUS");
    expect(padronizarNomeProduto("Ácido Paracético 15%")).toBe("ÁCIDO PARACÉTICO 15%");
    expect(padronizarNomeProduto("K-Othrine")).toBe("K-OTHRINE");
  });

  it("tira espaço das pontas, sem mexer no meio", () => {
    expect(padronizarNomeProduto("  Wiser CAB ")).toBe("WISER CAB");
    expect(padronizarNomeProduto("Super  Triplo")).toBe("SUPER  TRIPLO");
  });
});

describe("pontuacaoParecido", () => {
  it("acha as grafias diferentes que já aconteceram entre as fazendas", () => {
    const pares: [string, string][] = [
      ["Dimenxion", "DIMEXION"],
      ["Uréia", "UREIA"],
      ["Terra Sorbe", "TERRA SORB"],
      ["CaB Wiser", "WISER CAB"],
      ["Weak Up", "WAKE UP"],
      ["Optimos", "OPTIMUS"],
      ["Malation", "MALATHION"],
      ["Citoblom", "CITOBLOON"],
      ["Coraza", "COROZA"],
    ];
    for (const [digitado, existente] of pares) {
      expect(pontuacaoParecido(digitado, existente), `${digitado} x ${existente}`).not.toBeNull();
    }
  });

  it("acha pelo começo do nome enquanto digita", () => {
    expect(pontuacaoParecido("dim", "DIMEXION")).not.toBeNull();
  });

  it("não sugere nada com menos de 3 letras", () => {
    expect(pontuacaoParecido("di", "DIMEXION")).toBeNull();
  });

  it("não confunde produtos diferentes", () => {
    expect(pontuacaoParecido("DECIS", "DELAN")).toBeNull();
    expect(pontuacaoParecido("BION", "BIOSTIN CAB")).toBeNull();
    expect(pontuacaoParecido("MANFIL", "FINALE")).toBeNull();
  });
});

describe("mesmoProduto", () => {
  it("considera igual ignorando acento, maiúscula e unidade KG/Kg", () => {
    expect(mesmoProduto({ nome: "Uréia", unidade: "Kg" }, { nome: "UREIA", unidade: "KG" })).toBe(true);
  });

  it("mesmo nome com unidade diferente é outro produto (ex: Viviful em Kg e em L)", () => {
    expect(mesmoProduto({ nome: "VIVIFUL", unidade: "Kg" }, { nome: "VIVIFUL", unidade: "L" })).toBe(false);
  });
});

describe("agruparProdutosExistentes + buscarParecidos", () => {
  const produtos = [
    { nome: "DIMEXION", unidade: "L", propriedadeId: "lap", propriedadeNome: "Lapinha" },
    { nome: "DIMEXION", unidade: "L", propriedadeId: "pomo", propriedadeNome: "Pomo" },
    { nome: "DELAN", unidade: "Kg", propriedadeId: "pomo", propriedadeNome: "Pomo" },
  ];

  it("junta o mesmo produto das duas fazendas numa sugestão só", () => {
    const existentes = agruparProdutosExistentes(produtos, "lap");
    expect(existentes).toHaveLength(2);
    expect(existentes[0]).toEqual({ nome: "DIMEXION", unidade: "L", fazendas: ["Lapinha", "Pomo"], nestaFazenda: true });
    expect(existentes[1].nestaFazenda).toBe(false);
  });

  it("sugere DIMEXION quando o gerente digita Dimenxion", () => {
    const existentes = agruparProdutosExistentes(produtos, "lap");
    expect(buscarParecidos("Dimenxion", existentes).map((p) => p.nome)).toEqual(["DIMEXION"]);
  });
});

describe("unidadeDaLista", () => {
  it("usa o valor da lista quando só muda maiúscula/minúscula", () => {
    expect(unidadeDaLista("KG")).toBe("Kg");
    expect(unidadeDaLista("l")).toBe("L");
  });

  it("mantém a unidade como está quando não existe na lista", () => {
    expect(unidadeDaLista("bombona")).toBe("bombona");
  });
});
