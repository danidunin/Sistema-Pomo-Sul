import { describe, expect, it } from "vitest";
import { agruparEstoqueConsolidado } from "./estoque";

const lapinha = { propriedadeId: "lap", propriedade: { nome: "Lapinha" } };
const pomo = { propriedadeId: "pomo", propriedade: { nome: "Pomo" } };

describe("agruparEstoqueConsolidado", () => {
  it("mesmo nome nas duas fazendas vira uma linha só, somando", () => {
    const r = agruparEstoqueConsolidado([
      { nome: "ACIDO PERACETICO 15%", unidade: "L", quantidadeDisponivel: 25.66, ...lapinha },
      { nome: "ACIDO PERACETICO 15%", unidade: "L", quantidadeDisponivel: 78.5, ...pomo },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].porUnidade).toHaveLength(1);
    expect(r[0].porUnidade[0].totalDisponivel).toBeCloseTo(104.16);
    expect(r[0].porUnidade[0].porPropriedade.map((p) => p.quantidadeDisponivel)).toEqual([25.66, 78.5]);
  });

  it("acento, maiúscula e espaço não separam o mesmo produto", () => {
    const r = agruparEstoqueConsolidado([
      { nome: "ÁCIDO PERACÉTICO 15%", unidade: "L", quantidadeDisponivel: 1, ...lapinha },
      { nome: "acido  peracetico 15%", unidade: "l", quantidadeDisponivel: 2, ...pomo },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].porUnidade).toHaveLength(1);
    expect(r[0].porUnidade[0].totalDisponivel).toBe(3);
  });

  it("nomes diferentes continuam separados (PARACETICO x PERACETICO)", () => {
    const r = agruparEstoqueConsolidado([
      { nome: "ACIDO PARACETICO 15%", unidade: "L", quantidadeDisponivel: 1, ...pomo },
      { nome: "ACIDO PERACETICO 15%", unidade: "L", quantidadeDisponivel: 2, ...lapinha },
    ]);
    expect(r).toHaveLength(2);
  });

  it("mesmo nome com unidade diferente não soma litro com quilo", () => {
    const r = agruparEstoqueConsolidado([
      { nome: "VIVIFUL", unidade: "Kg", quantidadeDisponivel: 3, ...lapinha },
      { nome: "VIVIFUL", unidade: "L", quantidadeDisponivel: 1.8, ...lapinha },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].porUnidade).toHaveLength(2);
  });

  it("quantidade em Decimal (como vem do banco) é somada certo", () => {
    const decimal = (v: string) => ({ toString: () => v });
    const r = agruparEstoqueConsolidado([
      { nome: "UREIA", unidade: "KG", quantidadeDisponivel: decimal("3301.6"), ...lapinha },
      { nome: "UREIA", unidade: "Kg", quantidadeDisponivel: decimal("3318.28"), ...pomo },
    ]);
    expect(r[0].porUnidade[0].totalDisponivel).toBeCloseTo(6619.88);
  });
});
