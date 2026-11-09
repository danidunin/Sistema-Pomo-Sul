import { describe, expect, it } from "vitest";
import { compararChuvaPorMes, somarPeriodoComum } from "@/lib/chuva";

function leitura(propriedadeId: string, data: string, quantidadeMm: number | string) {
  return { propriedadeId, data: new Date(`${data}T00:00:00.000Z`), quantidadeMm };
}

describe("compararChuvaPorMes", () => {
  it("soma cada propriedade separadamente no mesmo mês", () => {
    const resultado = compararChuvaPorMes([
      leitura("lapinha", "2026-07-03", 20),
      leitura("lapinha", "2026-07-15", "12.5"),
      leitura("pomo", "2026-07-03", 18),
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].mes).toBe("2026-07");
    expect(resultado[0].label).toBe("Julho de 2026");
    expect(resultado[0].porPropriedade).toEqual({
      lapinha: { totalMm: 32.5, quantidadeEventos: 2 },
      pomo: { totalMm: 18, quantidadeEventos: 1 },
    });
  });

  it("mês sem leitura numa propriedade fica sem entrada dela", () => {
    const resultado = compararChuvaPorMes([
      leitura("lapinha", "2026-06-10", 30),
      leitura("pomo", "2026-07-02", 5),
    ]);

    expect(resultado.map((r) => r.mes)).toEqual(["2026-07", "2026-06"]);
    expect(resultado[0].porPropriedade).toEqual({ pomo: { totalMm: 5, quantidadeEventos: 1 } });
    expect(resultado[1].porPropriedade).toEqual({ lapinha: { totalMm: 30, quantidadeEventos: 1 } });
  });

  it("ordena do mês mais recente para o mais antigo, atravessando anos", () => {
    const resultado = compararChuvaPorMes([
      leitura("lapinha", "2025-12-20", 10),
      leitura("pomo", "2026-01-05", 10),
      leitura("lapinha", "2025-11-01", 10),
    ]);

    expect(resultado.map((r) => r.mes)).toEqual(["2026-01", "2025-12", "2025-11"]);
  });

  it("lista vazia não gera meses", () => {
    expect(compararChuvaPorMes([])).toEqual([]);
  });
});

describe("somarPeriodoComum", () => {
  it("só compara a partir do dia em que a última propriedade começou a medir", () => {
    const resultado = somarPeriodoComum(
      [
        leitura("lapinha", "2026-03-22", 60),
        leitura("lapinha", "2026-07-07", 89),
        leitura("pomo", "2026-07-07", 50),
        leitura("lapinha", "2026-07-23", 40),
      ],
      ["lapinha", "pomo"],
      "2026",
    );

    expect(resultado?.inicio.toISOString().slice(0, 10)).toBe("2026-07-07");
    expect(resultado?.desdeInicioDoAno).toBe(false);
    expect(resultado?.totais).toEqual({ lapinha: 129, pomo: 50 });
  });

  it("se as duas já mediam antes do ano, usa o ano inteiro", () => {
    const resultado = somarPeriodoComum(
      [
        leitura("lapinha", "2025-05-01", 10),
        leitura("pomo", "2025-08-01", 10),
        leitura("lapinha", "2026-02-10", 30),
        leitura("pomo", "2026-02-10", 25),
      ],
      ["lapinha", "pomo"],
      "2026",
    );

    expect(resultado?.desdeInicioDoAno).toBe(true);
    expect(resultado?.totais).toEqual({ lapinha: 30, pomo: 25 });
  });

  it("propriedade sem nenhuma leitura não tem período comum", () => {
    expect(somarPeriodoComum([leitura("lapinha", "2026-03-22", 60)], ["lapinha", "pomo"], "2026")).toBeNull();
  });

  it("propriedade que só começou a medir depois do ano não tem período comum nele", () => {
    const resultado = somarPeriodoComum(
      [leitura("lapinha", "2025-03-01", 60), leitura("pomo", "2026-07-07", 50)],
      ["lapinha", "pomo"],
      "2025",
    );
    expect(resultado).toBeNull();
  });
});
