import { db } from "@/lib/db";
import type { CandidatoMesmaAplicacao } from "@/components/operacoes/operacao-form";

/**
 * Lista todas as operações da propriedade (id, quadra, data e produtos) para o formulário
 * de tratamento oferecer como candidatas ao vínculo "mesma aplicação". Sem recorte por data:
 * o vínculo também precisa funcionar para corrigir manualmente lançamentos antigos, não só
 * para operações recentes — o formulário filtra para a quadra/data próximas na exibição.
 */
export async function buscarCandidatosMesmaAplicacao(propriedadeId: string): Promise<CandidatoMesmaAplicacao[]> {
  const operacoes = await db.operacaoAgricola.findMany({
    where: { talhao: { propriedadeId } },
    orderBy: { data: "desc" },
    select: {
      id: true,
      talhaoId: true,
      data: true,
      produtos: { select: { produto: { select: { nome: true } } } },
    },
  });

  return operacoes.map((o) => ({
    id: o.id,
    talhaoId: o.talhaoId,
    data: o.data.toISOString().slice(0, 10),
    resumo: o.produtos.map((p) => p.produto.nome).join(", ") || "sem produtos",
  }));
}
