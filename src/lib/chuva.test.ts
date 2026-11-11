import { describe, expect, it } from "vitest";
import { calcularChuvaDesdeUltimoTratamentoPorTalhao, compararChuvaPorMes } from "@/lib/chuva";

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

function dia(data: string) {
  return new Date(`${data}T00:00:00.000Z`);
}

function trat(id: string, talhaoId: string, data: string, criadoEm = "2026-01-01T00:00:00.000Z") {
  return { id, talhaoId, data: dia(data), createdAt: new Date(criadoEm) };
}

function chuva(data: string, quantidadeMm: number, relacaoTratamentoDia: "ANTES" | "DEPOIS" | null = null) {
  return { data: dia(data), quantidadeMm, relacaoTratamentoDia };
}

describe("calcularChuvaDesdeUltimoTratamentoPorTalhao", () => {
  it("soma toda a chuva depois do último tratamento, não só a última leitura", () => {
    const resultado = calcularChuvaDesdeUltimoTratamentoPorTalhao(
      [trat("t1", "q16", "2026-11-03")],
      [chuva("2026-11-01", 50), chuva("2026-11-05", 12), chuva("2026-11-08", 7.5), chuva("2026-11-10", 19)],
    );
    expect(resultado.get("q16")).toBe(38.5);
  });

  it("cada quadra conta a partir do seu próprio último tratamento", () => {
    const resultado = calcularChuvaDesdeUltimoTratamentoPorTalhao(
      [trat("a1", "A", "2026-10-20"), trat("a2", "A", "2026-11-06"), trat("b1", "B", "2026-11-02")],
      [chuva("2026-11-01", 10), chuva("2026-11-04", 20), chuva("2026-11-08", 5)],
    );
    expect(resultado.get("A")).toBe(5);
    expect(resultado.get("B")).toBe(25);
  });

  it("chuva no dia do tratamento só conta se foi depois da aplicação", () => {
    const resultado = calcularChuvaDesdeUltimoTratamentoPorTalhao(
      [trat("t1", "q1", "2026-11-05")],
      [chuva("2026-11-05", 8, "ANTES"), chuva("2026-11-05", 3, "DEPOIS"), chuva("2026-11-05", 4, null)],
    );
    expect(resultado.get("q1")).toBe(3);
  });

  it("sem chuva depois do tratamento dá zero; quadra sem tratamento fica de fora", () => {
    const resultado = calcularChuvaDesdeUltimoTratamentoPorTalhao(
      [trat("t1", "q1", "2026-11-09")],
      [chuva("2026-11-01", 10)],
    );
    expect(resultado.get("q1")).toBe(0);
    expect(resultado.has("q2")).toBe(false);
  });

  it("dois tratamentos no mesmo dia: vale o último lançado", () => {
    const resultado = calcularChuvaDesdeUltimoTratamentoPorTalhao(
      [
        trat("depois", "q1", "2026-11-05", "2026-11-05T15:00:00.000Z"),
        trat("antes", "q1", "2026-11-05", "2026-11-05T09:00:00.000Z"),
      ],
      [chuva("2026-11-07", 6)],
    );
    expect(resultado.get("q1")).toBe(6);
  });

  it("arredonda pra uma casa decimal", () => {
    const resultado = calcularChuvaDesdeUltimoTratamentoPorTalhao(
      [trat("t1", "q1", "2026-11-01")],
      [chuva("2026-11-02", 0.1), chuva("2026-11-03", 0.2)],
    );
    expect(resultado.get("q1")).toBe(0.3);
  });
});
