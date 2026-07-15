import { db } from "@/lib/db";

export async function buscarHistoricoManutencao(maquinaId: string) {
  return db.manutencao.findMany({
    where: { maquinaId },
    orderBy: { data: "desc" },
    include: {
      documentos: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function buscarHistoricoRevisoes(maquinaId: string) {
  return db.revisao.findMany({
    where: { maquinaId },
    orderBy: { data: "desc" },
  });
}
