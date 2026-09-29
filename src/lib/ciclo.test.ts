import { describe, expect, it } from "vitest";
import { cicloDaData } from "@/lib/ciclo";

describe("cicloDaData", () => {
  it("uma data em maio cai no ciclo que começa no mesmo ano", () => {
    const ciclo = cicloDaData(new Date("2026-05-15T00:00:00.000Z"));
    expect(ciclo.anoInicio).toBe(2026);
    expect(ciclo.label).toBe("2026/2027");
  });

  it("uma data em abril cai no ciclo que começou no ano anterior", () => {
    const ciclo = cicloDaData(new Date("2026-04-15T00:00:00.000Z"));
    expect(ciclo.anoInicio).toBe(2025);
    expect(ciclo.label).toBe("2025/2026");
  });

  it("1º de maio já é o início do novo ciclo", () => {
    expect(cicloDaData(new Date("2026-05-01T00:00:00.000Z")).label).toBe("2026/2027");
  });

  it("30 de abril ainda é o último dia do ciclo anterior", () => {
    expect(cicloDaData(new Date("2026-04-30T00:00:00.000Z")).label).toBe("2025/2026");
  });

  it("define início e fim do ciclo em UTC, cobrindo o ano inteiro", () => {
    const ciclo = cicloDaData(new Date("2026-06-01T00:00:00.000Z"));
    expect(ciclo.inicio.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(ciclo.fim.toISOString()).toBe("2027-04-30T23:59:59.999Z");
  });
});
