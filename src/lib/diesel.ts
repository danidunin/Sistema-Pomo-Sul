import { db } from "@/lib/db";
import type { TanqueDiesel } from "@/generated/prisma/client";
import type { TipoMovimentacao } from "@/generated/prisma/enums";

export type ResumoDiesel = {
  tanque: TanqueDiesel;
  consumoMesLitros: number;
  ultimaMovimentacao: { tipo: TipoMovimentacao; quantidadeLitros: number; data: Date } | null;
  percentualOcupado: number;
  alerta: boolean;
};

export async function buscarTanquePrincipal(propriedadeId: string) {
  return db.tanqueDiesel.findFirst({
    where: { propriedadeId, ativo: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function buscarResumoDiesel(propriedadeId: string): Promise<ResumoDiesel | null> {
  const tanque = await buscarTanquePrincipal(propriedadeId);
  if (!tanque) return null;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [saidasDoMes, ultimaMovimentacao] = await Promise.all([
    db.dieselMovimentacao.aggregate({
      where: { tanqueId: tanque.id, tipo: "SAIDA", data: { gte: inicioMes } },
      _sum: { quantidadeLitros: true },
    }),
    db.dieselMovimentacao.findFirst({
      where: { tanqueId: tanque.id },
      orderBy: [{ data: "desc" }, { createdAt: "desc" }],
      select: { tipo: true, quantidadeLitros: true, data: true },
    }),
  ]);

  const capacidade = Number(tanque.capacidadeLitros);
  const atual = Number(tanque.estoqueAtualLitros);
  const percentualOcupado = capacidade > 0 ? (atual / capacidade) * 100 : 0;

  return {
    tanque,
    consumoMesLitros: Number(saidasDoMes._sum.quantidadeLitros ?? 0),
    ultimaMovimentacao: ultimaMovimentacao
      ? {
          tipo: ultimaMovimentacao.tipo,
          quantidadeLitros: Number(ultimaMovimentacao.quantidadeLitros),
          data: ultimaMovimentacao.data,
        }
      : null,
    percentualOcupado,
    alerta: atual <= Number(tanque.estoqueMinimoLitros),
  };
}

export type FiltrosHistoricoDiesel = {
  dataInicio?: string;
  dataFim?: string;
  tipo?: string;
};

export async function buscarHistoricoDiesel(tanqueId: string, filtros: FiltrosHistoricoDiesel) {
  const data =
    filtros.dataInicio || filtros.dataFim
      ? {
          ...(filtros.dataInicio ? { gte: new Date(filtros.dataInicio) } : {}),
          ...(filtros.dataFim ? { lte: new Date(filtros.dataFim) } : {}),
        }
      : undefined;

  const movimentacoes = await db.dieselMovimentacao.findMany({
    where: {
      tanqueId,
      ...(data ? { data } : {}),
      ...(filtros.tipo === "ENTRADA" || filtros.tipo === "SAIDA" ? { tipo: filtros.tipo } : {}),
    },
    orderBy: { data: "desc" },
  });

  const totalEntradas = movimentacoes
    .filter((m) => m.tipo === "ENTRADA")
    .reduce((soma, m) => soma + Number(m.quantidadeLitros), 0);
  const totalSaidas = movimentacoes
    .filter((m) => m.tipo === "SAIDA")
    .reduce((soma, m) => soma + Number(m.quantidadeLitros), 0);

  return { movimentacoes, totalEntradas, totalSaidas };
}
