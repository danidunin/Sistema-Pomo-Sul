import { describe, expect, it } from "vitest";
import { tiposParaAbas, validarTipoSelecionado } from "@/lib/operacoes";

describe("tiposParaAbas", () => {
  it("sem OUTRA nos dados, retorna as três abas fixas, nessa ordem", () => {
    expect(tiposParaAbas(["ADUBACAO", "HERBICIDA"])).toEqual([
      "ADUBACAO",
      "FITOSSANITARIO",
      "HERBICIDA",
    ]);
  });

  it("sem nenhum dado, ainda retorna as três abas fixas", () => {
    expect(tiposParaAbas([])).toEqual(["ADUBACAO", "FITOSSANITARIO", "HERBICIDA"]);
  });

  it("com OUTRA nos dados, inclui Outra ao final", () => {
    expect(tiposParaAbas(["FITOSSANITARIO", "OUTRA"])).toEqual([
      "ADUBACAO",
      "FITOSSANITARIO",
      "HERBICIDA",
      "OUTRA",
    ]);
  });
});

describe("validarTipoSelecionado", () => {
  const abasComOutra = ["ADUBACAO", "FITOSSANITARIO", "HERBICIDA", "OUTRA"] as const;
  const abasSemOutra = ["ADUBACAO", "FITOSSANITARIO", "HERBICIDA"] as const;

  it("sem parâmetro, retorna null (Todos)", () => {
    expect(validarTipoSelecionado(undefined, [...abasComOutra])).toBeNull();
  });

  it("parâmetro válido e disponível, retorna o tipo", () => {
    expect(validarTipoSelecionado("HERBICIDA", [...abasComOutra])).toBe("HERBICIDA");
  });

  it("parâmetro que não é um TipoOperacao válido, retorna null", () => {
    expect(validarTipoSelecionado("QUALQUER_COISA", [...abasComOutra])).toBeNull();
  });

  it("parâmetro válido mas sem aba disponível para ele (ex: OUTRA sem dados), retorna null", () => {
    expect(validarTipoSelecionado("OUTRA", [...abasSemOutra])).toBeNull();
  });
});
