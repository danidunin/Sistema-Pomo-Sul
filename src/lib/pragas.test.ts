import { describe, expect, it } from "vitest";
import {
  mediaPonto,
  agruparMediaPorData,
  calcularSerieNivelControle,
  statusAtualPonto,
  avaliarNivelControle,
  montarSecaoGrade,
} from "@/lib/pragas";

describe("mediaPonto", () => {
  it("retorna 0 para lista vazia", () => {
    expect(mediaPonto([])).toBe(0);
  });

  it("calcula a média simples", () => {
    expect(mediaPonto([10, 20, 30])).toBe(20);
  });
});

describe("agruparMediaPorData", () => {
  it("agrupa leituras de várias armadilhas na mesma data e calcula a média", () => {
    const d1 = new Date("2026-08-11T00:00:00.000Z");
    const d2 = new Date("2026-08-14T00:00:00.000Z");
    const resultado = agruparMediaPorData([
      { data: d1, quantidade: 41 },
      { data: d1, quantidade: 18 },
      { data: d1, quantidade: 17 },
      { data: d2, quantidade: 4 },
      { data: d2, quantidade: 13 },
    ]);
    expect(resultado).toEqual([
      { data: d1, media: 25.333333333333332 },
      { data: d2, media: 8.5 },
    ]);
  });

  it("ordena o resultado por data crescente independente da ordem de entrada", () => {
    const d1 = new Date("2026-08-11T00:00:00.000Z");
    const d2 = new Date("2026-08-14T00:00:00.000Z");
    const resultado = agruparMediaPorData([
      { data: d2, quantidade: 10 },
      { data: d1, quantidade: 20 },
    ]);
    expect(resultado.map((r) => r.data.getTime())).toEqual([d1.getTime(), d2.getTime()]);
  });
});

describe("avaliarNivelControle", () => {
  it("BONAGOTA/GRAPHOLITA/CYDIA: baixo abaixo de 10, atenção de 10 a 19, controle a partir de 20", () => {
    expect(avaliarNivelControle("BONAGOTA", 9.99)).toBe("BAIXO");
    expect(avaliarNivelControle("BONAGOTA", 10)).toBe("ATENCAO");
    expect(avaliarNivelControle("BONAGOTA", 19.99)).toBe("ATENCAO");
    expect(avaliarNivelControle("BONAGOTA", 20)).toBe("CONTROLE");
    expect(avaliarNivelControle("GRAPHOLITA_MOLESTA", 20)).toBe("CONTROLE");
    expect(avaliarNivelControle("CYDIA", 20)).toBe("CONTROLE");
  });

  it("MOSCA_DAS_FRUTAS: baixo abaixo de 0.3, atenção de 0.3 a 0.49, controle a partir de 0.5", () => {
    expect(avaliarNivelControle("MOSCA_DAS_FRUTAS", 0.29)).toBe("BAIXO");
    expect(avaliarNivelControle("MOSCA_DAS_FRUTAS", 0.3)).toBe("ATENCAO");
    expect(avaliarNivelControle("MOSCA_DAS_FRUTAS", 0.49)).toBe("ATENCAO");
    expect(avaliarNivelControle("MOSCA_DAS_FRUTAS", 0.5)).toBe("CONTROLE");
  });
});

// Valores reais da aba "Pomo Sul" da planilha Monitoramento_2026-2027.xlsx,
// ponto "SEDE" (Grapholita molesta), datas 04/08 a 21/08/2026 — confirma que
// a série replica exatamente a coluna "Soma 2 leit." da planilha original.
describe("calcularSerieNivelControle — Grapholita/Bonagota/Cydia (soma das 2 últimas médias)", () => {
  it("reproduz a soma semanal real do ponto SEDE (Pomo Sul, safra 2026/2027)", () => {
    const datas = ["2026-08-04", "2026-08-07", "2026-08-11", "2026-08-14", "2026-08-18", "2026-08-21"].map(
      (s) => new Date(`${s}T00:00:00.000Z`),
    );
    const medias = [0, 0, 25.333333333333332, 5.666666666666667, 14, 28];
    const leiturasPorData = datas.map((data, i) => ({ data, media: medias[i] }));

    const serie = calcularSerieNivelControle("GRAPHOLITA_MOLESTA", leiturasPorData);

    expect(serie.map((s) => s.metrica)).toEqual([0, 0, 25.333333333333332, 31, 19.666666666666668, 42]);
    // Corrected expectation: 19.666... < 20, so it's ATENCAO not CONTROLE (brief had a typo)
    expect(serie.map((s) => s.nivel)).toEqual(["BAIXO", "BAIXO", "CONTROLE", "CONTROLE", "ATENCAO", "CONTROLE"]);
  });

  it("primeira leitura do ponto usa só a média atual (sem leitura anterior)", () => {
    const serie = calcularSerieNivelControle("BONAGOTA", [{ data: new Date("2026-08-04T00:00:00.000Z"), media: 12 }]);
    expect(serie).toEqual([
      { data: new Date("2026-08-04T00:00:00.000Z"), mediaAtual: 12, metrica: 12, nivel: "ATENCAO" },
    ]);
  });
});

describe("calcularSerieNivelControle — Moscas-das-frutas (MAD = soma das 2 últimas médias ÷ 7)", () => {
  it("calcula o MAD e aplica os limiares de 0,3 e 0,5", () => {
    const d1 = new Date("2026-08-04T00:00:00.000Z");
    const d2 = new Date("2026-08-07T00:00:00.000Z");
    const serie = calcularSerieNivelControle("MOSCA_DAS_FRUTAS", [
      { data: d1, media: 1.05 },
      { data: d2, media: 1.05 },
    ]);
    // MAD do dia 2 = (1.05 + 1.05) / 7 = 0.3 -> exatamente no limiar de atenção
    expect(serie[1].metrica).toBeCloseTo(0.3, 10);
    expect(serie[1].nivel).toBe("ATENCAO");
  });
});

describe("statusAtualPonto", () => {
  it("retorna null quando o ponto não tem nenhuma leitura", () => {
    expect(statusAtualPonto("BONAGOTA", [])).toBeNull();
  });

  it("retorna o status da leitura mais recente", () => {
    const d1 = new Date("2026-08-04T00:00:00.000Z");
    const d2 = new Date("2026-08-07T00:00:00.000Z");
    const status = statusAtualPonto("BONAGOTA", [
      { data: d1, quantidade: 5 },
      { data: d2, quantidade: 25 },
    ]);
    expect(status?.data).toEqual(d2);
    expect(status?.nivel).toBe("CONTROLE");
  });
});

describe("montarSecaoGrade", () => {
  it("monta colunas por armadilha agrupadas por ponto e a união das datas em ordem", () => {
    const d1 = new Date("2026-08-04T00:00:00.000Z");
    const d2 = new Date("2026-08-07T00:00:00.000Z");
    const secao = montarSecaoGrade([
      {
        id: "ponto-1",
        nome: "SEDE",
        tipoPraga: "BONAGOTA",
        armadilhas: [
          { id: "arm-1", rotulo: "1-Kampai 11", leituras: [{ data: d2, quantidade: 30 }] },
          { id: "arm-2", rotulo: "2-Kampai 10", leituras: [{ data: d1, quantidade: 5 }, { data: d2, quantidade: 10 }] },
        ],
      },
    ]);

    expect(secao.pontos).toEqual([
      { id: "ponto-1", nome: "SEDE", armadilhas: [{ id: "arm-1", rotulo: "1-Kampai 11" }, { id: "arm-2", rotulo: "2-Kampai 10" }] },
    ]);
    expect(secao.linhas.map((l) => l.data)).toEqual([d1, d2]);
  });

  it("deixa null a célula de uma armadilha sem leitura naquela data, e calcula a célula do ponto via o cálculo já testado", () => {
    const d1 = new Date("2026-08-04T00:00:00.000Z");
    const d2 = new Date("2026-08-07T00:00:00.000Z");
    const secao = montarSecaoGrade([
      {
        id: "ponto-1",
        nome: "SEDE",
        tipoPraga: "BONAGOTA",
        armadilhas: [
          { id: "arm-1", rotulo: "1-Kampai 11", leituras: [{ data: d1, quantidade: 10 }, { data: d2, quantidade: 30 }] },
          { id: "arm-2", rotulo: "2-Kampai 10", leituras: [{ data: d2, quantidade: 10 }] },
        ],
      },
    ]);

    // arm-2 não tem leitura em d1 -> célula null, sem "virar zero" na tabela.
    expect(secao.linhas[0].porArmadilha["arm-2"]).toBeNull();
    // Ponto: d1 média=10 (só arm-1) -> metrica=10 -> ATENCAO; d2 média=(30+10)/2=20,
    // metrica=20+10=30 -> CONTROLE. Mesma matemática de calcularSerieNivelControle.
    expect(secao.linhas[0].porPonto["ponto-1"]).toEqual({ media: 10, metrica: 10, nivel: "ATENCAO" });
    expect(secao.linhas[1].porPonto["ponto-1"]).toEqual({ media: 20, metrica: 30, nivel: "CONTROLE" });
  });

  it("retorna seção vazia (sem datas) quando não há nenhum ponto", () => {
    expect(montarSecaoGrade([])).toEqual({ tipoPraga: "GRAPHOLITA_MOLESTA", pontos: [], linhas: [] });
  });
});
