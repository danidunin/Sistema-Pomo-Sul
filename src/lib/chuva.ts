import { db } from "@/lib/db";

export async function buscarChuvaRegistros(propriedadeId: string) {
  return db.chuvaRegistro.findMany({
    where: { propriedadeId },
    orderBy: { data: "desc" },
  });
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
