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

import { agruparContagensPorQuadra, type ContagemParaAgrupar } from "@/lib/contagem-frutos";

function contagem(overrides: Partial<ContagemParaAgrupar>): ContagemParaAgrupar {
  return {
    talhaoId: "talhao1",
    talhaoNome: "Quadra 1",
    numeroPlantasTalhao: 1000,
    safra: "2026/2027",
    metaFrutosPorPlanta: 180,
    numeroPlantasAmostradas: 50,
    frutosContados: 9000,
    plantasPorHectare: 500,
    pesoMedioFrutoG: 200,
    data: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("agruparContagensPorQuadra", () => {
  it("agrupa por talhão + safra, não só por talhão", () => {
    const resultado = agruparContagensPorQuadra([
      contagem({ safra: "2025/2026" }),
      contagem({ safra: "2026/2027" }),
    ]);
    expect(resultado).toHaveLength(2);
    expect(resultado.map((g) => g.safra).sort()).toEqual(["2025/2026", "2026/2027"]);
  });

  it("não mistura quadras diferentes na mesma safra", () => {
    const resultado = agruparContagensPorQuadra([
      contagem({ talhaoId: "talhao1" }),
      contagem({ talhaoId: "talhao2", talhaoNome: "Quadra 2" }),
    ]);
    expect(resultado).toHaveLength(2);
  });

  it("calcula kg/ha ponderado pelas plantas amostradas de cada contagem, igual à média consolidada de hoje", () => {
    const resultado = agruparContagensPorQuadra([
      contagem({ numeroPlantasAmostradas: 40, frutosContados: 6000, plantasPorHectare: 500, pesoMedioFrutoG: 200 }),
      contagem({ numeroPlantasAmostradas: 10, frutosContados: 2000, plantasPorHectare: 500, pesoMedioFrutoG: 200 }),
    ]);
    // média frutos/planta ponderada: (150*40 + 200*10) / 50 = 160
    // kg/ha = 160 * 500 * 200 / 1000 = 16000
    expect(resultado[0].mediaFrutosPorPlanta).toBeCloseTo(160);
    expect(resultado[0].produtividadeEstimadaKgHa).toBeCloseTo(16000);
  });

  it("soma numeroPlantasAmostradas de todas as contagens do grupo (cumulativo)", () => {
    const resultado = agruparContagensPorQuadra([
      contagem({ numeroPlantasAmostradas: 40 }),
      contagem({ numeroPlantasAmostradas: 60 }),
    ]);
    expect(resultado[0].totalPlantasAmostradas).toBe(100);
  });

  it("calcula percentualAmostrado a partir do total cumulativo sobre numeroPlantasTalhao", () => {
    const resultado = agruparContagensPorQuadra([
      contagem({ numeroPlantasTalhao: 1000, numeroPlantasAmostradas: 40 }),
      contagem({ numeroPlantasTalhao: 1000, numeroPlantasAmostradas: 60 }),
    ]);
    expect(resultado[0].percentualAmostrado).toBeCloseTo(10);
  });

  it("percentualAmostrado é null quando o talhão não tem numeroPlantas cadastrado", () => {
    const resultado = agruparContagensPorQuadra([contagem({ numeroPlantasTalhao: null })]);
    expect(resultado[0].percentualAmostrado).toBeNull();
  });

  it("conta numeroContagens e acha a data mais recente do grupo", () => {
    const resultado = agruparContagensPorQuadra([
      contagem({ data: new Date("2026-09-01T00:00:00.000Z") }),
      contagem({ data: new Date("2026-09-19T00:00:00.000Z") }),
      contagem({ data: new Date("2026-09-10T00:00:00.000Z") }),
    ]);
    expect(resultado[0].numeroContagens).toBe(3);
    expect(resultado[0].dataUltimaContagem).toEqual(new Date("2026-09-19T00:00:00.000Z"));
  });

  it("lista vazia retorna lista vazia", () => {
    expect(agruparContagensPorQuadra([])).toEqual([]);
  });
});

import { ordenarGruposPorNomeQuadra, ordenarSafrasDesc } from "@/lib/contagem-frutos";

describe("ordenarGruposPorNomeQuadra", () => {
  it("ordena alfabeticamente pelo nome da quadra, acentos incluídos", () => {
    const grupos = [
      contagem({ talhaoNome: "Éter" }),
      contagem({ talhaoNome: "Abacate" }),
    ].map((c) => agruparContagensPorQuadra([c])[0]);

    const ordenado = ordenarGruposPorNomeQuadra(grupos);
    expect(ordenado.map((g) => g.talhaoNome)).toEqual(["Abacate", "Éter"]);
  });

  it("não modifica o array original", () => {
    const grupos = agruparContagensPorQuadra([contagem({ talhaoNome: "B" }), contagem({ talhaoId: "t2", talhaoNome: "A" })]);
    const original = [...grupos];
    ordenarGruposPorNomeQuadra(grupos);
    expect(grupos).toEqual(original);
  });
});

describe("ordenarSafrasDesc", () => {
  it("ordena da safra mais recente para a mais antiga, sem duplicar", () => {
    expect(ordenarSafrasDesc(["2024/2025", "2026/2027", "2024/2025", "2025/2026"])).toEqual([
      "2026/2027",
      "2025/2026",
      "2024/2025",
    ]);
  });

  it("lista vazia retorna lista vazia", () => {
    expect(ordenarSafrasDesc([])).toEqual([]);
  });
});
