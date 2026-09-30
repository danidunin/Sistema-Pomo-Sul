import { describe, expect, it } from "vitest";
import {
  statusCelula,
  agruparContagensPorTalhaoECiclo,
  ordenarCiclosDesc,
  resolverRaizAplicacao,
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

describe("resolverRaizAplicacao", () => {
  it("operação sem vínculo é sua própria raiz", () => {
    expect(resolverRaizAplicacao("op1", new Map())).toBe("op1");
  });

  it("segue a cadeia até a operação original", () => {
    const pais = new Map([
      ["op3", "op2"],
      ["op2", "op1"],
    ]);
    expect(resolverRaizAplicacao("op3", pais)).toBe("op1");
  });

  it("não entra em loop infinito se houver um ciclo nos dados", () => {
    const pais = new Map([
      ["opA", "opB"],
      ["opB", "opA"],
    ]);
    expect(() => resolverRaizAplicacao("opA", pais)).not.toThrow();
  });
});

describe("agruparContagensPorTalhaoECiclo com continuação de aplicação", () => {
  it("conta 1 só quando o mesmo produto aparece em duas operações marcadas como a mesma aplicação", () => {
    // Caso real: Orkestra aplicado em 1.800L no dia 1 e concluído com mais
    // 6.200L no dia seguinte — é a mesma aplicação, deve contar 1 vez.
    const pais = new Map([["op2", "op1"]]);
    const resultado = agruparContagensPorTalhaoECiclo(
      [
        { operacaoId: "op1", produtoId: "orkestra", talhaoId: "talhao1", data: new Date("2026-09-01T00:00:00.000Z") },
        { operacaoId: "op2", produtoId: "orkestra", talhaoId: "talhao1", data: new Date("2026-09-02T00:00:00.000Z") },
      ],
      [{ id: "orkestra", limite: 4 }],
      pais,
    );

    expect(resultado[0].porTalhaoECiclo.talhao1["2026/2027"]).toBe(1);
  });

  it("um produto que só aparece numa das operações do grupo continua contando normal", () => {
    // Caso real: Citoblom só na 1ª operação (6.200L); Orkestra nas duas
    // (6.200L + 1.800L, mesmo dia, dividido por causa do Citoblom).
    const pais = new Map([["op2", "op1"]]);
    const resultado = agruparContagensPorTalhaoECiclo(
      [
        { operacaoId: "op1", produtoId: "citoblom", talhaoId: "talhao1", data: new Date("2026-08-24T00:00:00.000Z") },
        { operacaoId: "op1", produtoId: "orkestra", talhaoId: "talhao1", data: new Date("2026-08-24T00:00:00.000Z") },
        { operacaoId: "op2", produtoId: "orkestra", talhaoId: "talhao1", data: new Date("2026-08-24T00:00:00.000Z") },
      ],
      [
        { id: "citoblom", limite: 4 },
        { id: "orkestra", limite: 4 },
      ],
      pais,
    );

    const porProduto = Object.fromEntries(resultado.map((r) => [r.produtoId, r.porTalhaoECiclo.talhao1["2026/2027"]]));
    expect(porProduto).toEqual({ citoblom: 1, orkestra: 1 });
  });

  it("resolve a raiz mesmo quando um elo intermediário não usa o produto em questão", () => {
    // op3 (dia 3, só Orkestra) está vinculado a op2 (dia 2, só Citoblom), que
    // está vinculado a op1 (dia 1, Orkestra) — a cadeia inteira é 1 aplicação.
    const pais = new Map([
      ["op3", "op2"],
      ["op2", "op1"],
    ]);
    const resultado = agruparContagensPorTalhaoECiclo(
      [
        { operacaoId: "op1", produtoId: "orkestra", talhaoId: "talhao1", data: new Date("2026-09-01T00:00:00.000Z") },
        { operacaoId: "op3", produtoId: "orkestra", talhaoId: "talhao1", data: new Date("2026-09-03T00:00:00.000Z") },
      ],
      [{ id: "orkestra", limite: 4 }],
      pais,
    );

    expect(resultado[0].porTalhaoECiclo.talhao1["2026/2027"]).toBe(1);
  });

  it("sem vínculo, continua contando cada operação separadamente (comportamento atual preservado)", () => {
    const resultado = agruparContagensPorTalhaoECiclo(
      [
        { operacaoId: "op1", produtoId: "orkestra", talhaoId: "talhao1", data: new Date("2026-09-01T00:00:00.000Z") },
        { operacaoId: "op2", produtoId: "orkestra", talhaoId: "talhao1", data: new Date("2026-09-02T00:00:00.000Z") },
      ],
      [{ id: "orkestra", limite: 4 }],
    );

    expect(resultado[0].porTalhaoECiclo.talhao1["2026/2027"]).toBe(2);
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
