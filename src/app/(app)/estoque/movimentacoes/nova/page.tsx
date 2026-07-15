import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { MovimentacaoForm } from "@/components/estoque/movimentacao-form";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaMovimentacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();
  const produtos = await db.produto.findMany({
    where: { propriedadeId, ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, unidade: true, quantidadeDisponivel: true },
  });

  const tipoInicial = tipo === "saida" ? "SAIDA" : "ENTRADA";

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/estoque" label="Voltar ao estoque" />
      <h1 className="text-xl font-semibold text-neutral-900">Movimentação de estoque</h1>
      {produtos.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Cadastre um produto antes de registrar uma movimentação de estoque.
        </p>
      ) : (
        <MovimentacaoForm
          produtos={produtos.map((p) => ({ ...p, quantidadeDisponivel: Number(p.quantidadeDisponivel) }))}
          tipoInicial={tipoInicial}
        />
      )}
    </div>
  );
}
