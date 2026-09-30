import { describe, expect, it } from "vitest";
import { mediaPonderada } from "@/lib/contagem-frutos";

describe("mediaPonderada", () => {
  it("pondera pelo peso de cada par", () => {
    const resultado = mediaPonderada([
      { valor: 100, peso: 2 },
      { valor: 200, peso: 1 },
    ]);
    expect(resultado).toBeCloseTo((100 * 2 + 200 * 1) / 3);
  });

  it("peso total zero retorna 0 em vez de dividir por zero", () => {
    expect(mediaPonderada([{ valor: 100, peso: 0 }])).toBe(0);
  });

  it("lista vazia retorna 0", () => {
    expect(mediaPonderada([])).toBe(0);
  });

  it("um único par retorna o próprio valor", () => {
    expect(mediaPonderada([{ valor: 42, peso: 5 }])).toBe(42);
  });
});
