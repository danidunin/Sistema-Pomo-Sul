import { db } from "@/lib/db";
import type { ItemHistorico } from "@/lib/historico";

export async function buscarHistoricoManutencao(maquinaId: string): Promise<ItemHistorico[]> {
  const manutencoes = await db.manutencao.findMany({
    where: { maquinaId },
    orderBy: { data: "desc" },
  });

  return manutencoes.map((m) => ({
    id: m.id,
    data: m.data,
    titulo: m.servicoRealizado,
    subtitulo: [m.mecanico, m.valor ? `R$ ${m.valor.toString()}` : null].filter(Boolean).join(" · ") || undefined,
  }));
}
