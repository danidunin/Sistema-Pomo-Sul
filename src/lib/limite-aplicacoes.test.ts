import { describe, expect, it } from "vitest";
import {
  statusCelula,
  agruparContagensPorTalhaoECiclo,
  ordenarCiclosDesc,
} from "@/lib/limite-aplicacoes";

describe("statusCelula", () => {
  it("sem nenhuma aplicação retorna SEM_APLICACAO", () => {
    expect(statusCelula(0, 4)).toBe("SEM_APLICACAO");
  });

  it("abaixo do limite retorna DENTRO_LIMITE", () => {
    expect(statusCelula(2, 4)).toBe("DENTRO_LIMITE");
  });

  it("exatamente no limite retorna NO_LIMITE", () => {
    expect(statusCelula(4, 4)).toBe("NO_LIMITE");
  });

  it("acima do limite retorna ACIMA_LIMITE", () => {
    expect(statusCelula(5, 4)).toBe("ACIMA_LIMITE");
  });
});

describe("agruparContagensPorTalhaoECiclo", () => {
  it("conta uma aplicação por operação, agrupada por talhão e ciclo", () => {
    const resultado = agruparContagensPorTalhaoECiclo(
      [
        { operacaoId: "op1", produtoId: "prod1", talhaoId: "talhao1", data: new Date("2026-06-01T00:00:00.000Z") },
        { operacaoId: "op2", produtoId: "prod1", talhaoId: "talhao1", data: new Date("2026-07-01T00:00:00.000Z") },
        { operacaoId: "op3", produtoId: "prod1", talhaoId: "talhao2", data: new Date("2026-06-01T00:00:00.000Z") },
      ],
      [{ id: "prod1", limite: 4 }],
    );

    expect(resultado).toEqual([
      {
        produtoId: "prod1",
        limite: 4,
        porTalhaoECiclo: {
          talhao1: { "2026/2027": 2 },
          talhao2: { "2026/2027": 1 },
        },
      },
    ]);
  });

  it("não conta duas vezes a mesma operação+produto (linha duplicada)", () => {
    const resultado = agruparContagensPorTalhaoECiclo(
      [
        { operacaoId: "op1", produtoId: "prod1", talhaoId: "talhao1", data: new Date("2026-06-01T00:00:00.000Z") },
        { operacaoId: "op1", produtoId: "prod1", talhaoId: "talhao1", data: new Date("2026-06-01T00:00:00.000Z") },
      ],
      [{ id: "prod1", limite: 4 }],
    );

    expect(resultado[0].porTalhaoECiclo.talhao1["2026/2027"]).toBe(1);
  });

  it("separa aplicações em ciclos diferentes da mesma quadra", () => {
    const resultado = agruparContagensPorTalhaoECiclo(
      [
        { operacaoId: "op1", produtoId: "prod1", talhaoId: "talhao1", data: new Date("2026-04-30T00:00:00.000Z") },
        { operacaoId: "op2", produtoId: "prod1", talhaoId: "talhao1", data: new Date("2026-05-01T00:00:00.000Z") },
      ],
      [{ id: "prod1", limite: 4 }],
    );

    expect(resultado[0].porTalhaoECiclo.talhao1).toEqual({
      "2025/2026": 1,
      "2026/2027": 1,
    });
  });

  it("produto-chave sem nenhuma aplicação retorna um objeto vazio, não some da lista", () => {
    const resultado = agruparContagensPorTalhaoECiclo([], [{ id: "prod1", limite: 4 }]);
    expect(resultado).toEqual([{ produtoId: "prod1", limite: 4, porTalhaoECiclo: {} }]);
  });
});

describe("ordenarCiclosDesc", () => {
  it("ordena do ciclo mais recente para o mais antigo, sem duplicar", () => {
    expect(ordenarCiclosDesc(["2025/2026", "2027/2028", "2025/2026", "2026/2027"])).toEqual([
      "2027/2028",
      "2026/2027",
      "2025/2026",
    ]);
  });
});
