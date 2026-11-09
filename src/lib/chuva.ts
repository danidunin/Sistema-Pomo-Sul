import { db } from "@/lib/db";

export async function buscarChuvaRegistros(propriedadeId: string) {
  return db.chuvaRegistro.findMany({
    where: { propriedadeId },
    orderBy: { data: "desc" },
  });
}

export async function buscarChuvaTodasPropriedades() {
  return db.chuvaRegistro.findMany({ orderBy: [{ data: "desc" }, { createdAt: "desc" }] });
}

export async function buscarDatasComTratamentoFitossanitario(propriedadeId: string): Promise<string[]> {
  const operacoes = await db.operacaoAgricola.findMany({
    where: { tipo: "FITOSSANITARIO", talhao: { propriedadeId } },
    select: { data: true },
  });
  const datas = new Set(operacoes.map((o) => o.data.toISOString().slice(0, 10)));
  return Array.from(datas);
}

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export type ResumoMensalChuva = {
  mes: string;
  label: string;
  quantidadeEventos: number;
  totalMm: number;
};

/** Agrupa leituras de chuva por mês (UTC), mais recente primeiro. */
export function resumirChuvaPorMes(
  leituras: { data: Date; quantidadeMm: number | string }[],
): ResumoMensalChuva[] {
  const porMes = new Map<string, { quantidadeEventos: number; totalMm: number }>();

  for (const leitura of leituras) {
    const chave = leitura.data.toISOString().slice(0, 7);
    const atual = porMes.get(chave) ?? { quantidadeEventos: 0, totalMm: 0 };
    atual.quantidadeEventos += 1;
    atual.totalMm += Number(leitura.quantidadeMm);
    porMes.set(chave, atual);
  }

  return Array.from(porMes.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([mes, dados]) => {
      const [ano, mesNumero] = mes.split("-").map(Number);
      return { mes, label: `${MESES_PT[mesNumero - 1]} de ${ano}`, ...dados };
    });
}

export type ComparativoMensalChuva = {
  mes: string;
  label: string;
  /** Só tem entrada a propriedade que registrou alguma leitura naquele mês. */
  porPropriedade: Record<string, { totalMm: number; quantidadeEventos: number }>;
};

/** Põe o resumo mensal de cada propriedade lado a lado, mais recente primeiro. */
export function compararChuvaPorMes(
  leituras: { propriedadeId: string; data: Date; quantidadeMm: number | string }[],
): ComparativoMensalChuva[] {
  const porPropriedade = new Map<string, typeof leituras>();
  for (const leitura of leituras) {
    const lista = porPropriedade.get(leitura.propriedadeId) ?? [];
    lista.push(leitura);
    porPropriedade.set(leitura.propriedadeId, lista);
  }

  const meses = new Map<string, ComparativoMensalChuva>();
  for (const [propriedadeId, lista] of porPropriedade) {
    for (const resumo of resumirChuvaPorMes(lista)) {
      const linha = meses.get(resumo.mes) ?? { mes: resumo.mes, label: resumo.label, porPropriedade: {} };
      linha.porPropriedade[propriedadeId] = {
        totalMm: resumo.totalMm,
        quantidadeEventos: resumo.quantidadeEventos,
      };
      meses.set(resumo.mes, linha);
    }
  }

  return Array.from(meses.values()).sort((a, b) => b.mes.localeCompare(a.mes));
}

export type PeriodoComumChuva = { inicio: Date; desdeInicioDoAno: boolean; totais: Record<string, number> };

/**
 * Soma a chuva do ano de cada propriedade só a partir do dia em que todas já registravam
 * chuva — senão uma propriedade que começou a medir em julho "perde" de quem mede desde
 * janeiro. Null se alguma propriedade não tem leitura nesse período.
 */
export function somarPeriodoComum(
  leituras: { propriedadeId: string; data: Date; quantidadeMm: number | string }[],
  propriedadeIds: string[],
  ano: string,
): PeriodoComumChuva | null {
  const inicioAno = new Date(`${ano}-01-01T00:00:00.000Z`);
  const fimAno = new Date(`${Number(ano) + 1}-01-01T00:00:00.000Z`);

  let inicio = inicioAno;
  for (const id of propriedadeIds) {
    const datas = leituras.filter((l) => l.propriedadeId === id).map((l) => l.data.getTime());
    if (datas.length === 0) return null;
    const primeira = Math.min(...datas);
    if (primeira > inicio.getTime()) inicio = new Date(primeira);
  }
  if (inicio >= fimAno) return null;

  const totais: Record<string, number> = Object.fromEntries(propriedadeIds.map((id) => [id, 0]));
  for (const l of leituras) {
    if (l.propriedadeId in totais && l.data >= inicio && l.data < fimAno) {
      totais[l.propriedadeId] += Number(l.quantidadeMm);
    }
  }

  return { inicio, desdeInicioDoAno: inicio.getTime() === inicioAno.getTime(), totais };
}

export type OperacaoParaAcumulo = {
  id: string;
  talhaoId: string;
  data: Date;
  createdAt: Date;
};

export type ChuvaParaAcumulo = {
  data: Date;
  quantidadeMm: number | string;
  relacaoTratamentoDia: "ANTES" | "DEPOIS" | null;
};

/**
 * Para cada tratamento fitossanitário, soma a chuva registrada desde ele até o próximo
 * tratamento do mesmo talhão (ou até hoje, se for o mais recente). Chuva no mesmo dia do
 * tratamento atual só conta se marcada "DEPOIS"; chuva no mesmo dia do próximo tratamento
 * conta pelo atual a não ser que esteja marcada "DEPOIS" (nesse caso conta pelo próximo).
 * Puro — sem acesso a banco — para poder ser verificado isoladamente.
 */
export function calcularAcumuladoPorTratamento(
  operacoes: OperacaoParaAcumulo[],
  chuvas: ChuvaParaAcumulo[],
): Map<string, number> {
  const porTalhao = new Map<string, OperacaoParaAcumulo[]>();
  for (const op of operacoes) {
    const lista = porTalhao.get(op.talhaoId) ?? [];
    lista.push(op);
    porTalhao.set(op.talhaoId, lista);
  }

  const resultado = new Map<string, number>();

  for (const lista of porTalhao.values()) {
    const ordenada = [...lista].sort((a, b) => {
      const diff = a.data.getTime() - b.data.getTime();
      return diff !== 0 ? diff : a.createdAt.getTime() - b.createdAt.getTime();
    });

    for (let i = 0; i < ordenada.length; i++) {
      const atual = ordenada[i];
      const proxima = ordenada[i + 1] ?? null;
      const diaAtual = atual.data.getTime();
      const diaProxima = proxima ? proxima.data.getTime() : null;

      let acumulado = 0;
      for (const chuva of chuvas) {
        const diaChuva = chuva.data.getTime();

        if (diaChuva === diaAtual) {
          if (chuva.relacaoTratamentoDia !== "DEPOIS") continue;
        } else if (diaChuva < diaAtual) {
          continue;
        } else if (diaProxima !== null && diaChuva > diaProxima) {
          continue;
        } else if (diaProxima !== null && diaChuva === diaProxima) {
          if (chuva.relacaoTratamentoDia === "DEPOIS") continue;
        }

        acumulado += Number(chuva.quantidadeMm);
      }

      resultado.set(atual.id, acumulado);
    }
  }

  return resultado;
}
