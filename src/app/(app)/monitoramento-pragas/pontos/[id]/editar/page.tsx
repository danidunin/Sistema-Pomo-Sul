import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { PontoForm } from "@/components/pragas/ponto-form";
import { ExcluirPontoForm } from "@/components/pragas/excluir-ponto-form";
import { atualizarPontoMonitoramento } from "@/actions/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarPontoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const ponto = await db.pontoMonitoramento.findUnique({ where: { id } });
  if (!ponto || ponto.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <VoltarLink href={`/monitoramento-pragas/pontos/${ponto.id}`} label="Voltar" />
        <ExcluirPontoForm pontoId={ponto.id} />
      </div>

      <h1 className="text-xl font-semibold text-neutral-900">Editar ponto — {ponto.nome}</h1>

      <PontoForm
        action={atualizarPontoMonitoramento.bind(null, ponto.id)}
        defaultValues={{ tipoPraga: ponto.tipoPraga, nome: ponto.nome, safra: ponto.safra }}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
