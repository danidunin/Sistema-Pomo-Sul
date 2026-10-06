import { describe, expect, it } from "vitest";
import { diasDesdeTratamento, tiposParaAbas, validarTipoSelecionado } from "@/lib/operacoes";

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

describe("diasDesdeTratamento", () => {
  it("não conta o dia da aplicação: 25/09 até 05/10 dá 9 dias", () => {
    const tratamento = new Date("2026-09-25T12:00:00-03:00");
    const hoje = new Date("2026-10-05T08:00:00-03:00");
    expect(diasDesdeTratamento(tratamento, hoje)).toBe(9);
  });

  it("tratamento feito hoje ou ontem retorna 0", () => {
    const hoje = new Date("2026-10-05T23:30:00-03:00");
    expect(diasDesdeTratamento(new Date("2026-10-05T07:00:00-03:00"), hoje)).toBe(0);
    expect(diasDesdeTratamento(new Date("2026-10-04T10:00:00-03:00"), hoje)).toBe(0);
  });

  it("não cai para o dia anterior por causa do fuso UTC", () => {
    // 22h de Brasília = 01h UTC do dia seguinte: sem o fuso certo, contaria 1 dia a mais.
    const tratamento = new Date("2026-10-03T22:00:00-03:00");
    const hoje = new Date("2026-10-05T10:00:00-03:00");
    expect(diasDesdeTratamento(tratamento, hoje)).toBe(1);
  });
});
