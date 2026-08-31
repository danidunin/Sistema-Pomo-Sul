import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { MovimentacaoDieselForm } from "@/components/diesel/movimentacao-form";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaMovimentacaoDieselPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();
  const tanques = await db.tanqueDiesel.findMany({
    where: { propriedadeId, ativo: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, nome: true, estoqueAtualLitros: true },
  });

  const tipoInicial = tipo === "saida" ? "SAIDA" : "ENTRADA";

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/diesel" label="Voltar ao Controle de Diesel" />
      <h1 className="text-xl font-semibold text-neutral-900">Movimentação de diesel</h1>
      {tanques.length === 0 ? (
        <p className="text-sm text-neutral-500">Cadastre um tanque antes de registrar uma movimentação.</p>
      ) : (
        <MovimentacaoDieselForm
          tanques={tanques.map((t) => ({ ...t, estoqueAtualLitros: Number(t.estoqueAtualLitros) }))}
          tipoInicial={tipoInicial}
        />
      )}
    </div>
  );
}
