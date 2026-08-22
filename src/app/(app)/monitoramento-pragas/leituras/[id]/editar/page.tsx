import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { LeituraForm } from "@/components/pragas/leitura-form";
import { ExcluirLeituraForm } from "@/components/pragas/excluir-leitura-form";
import { atualizarLeituraArmadilha } from "@/actions/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarLeituraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const leitura = await db.leituraArmadilha.findUnique({
    where: { id },
    include: { armadilha: { include: { pontoMonitoramento: true } } },
  });
  if (!leitura || leitura.armadilha.pontoMonitoramento.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <VoltarLink href={`/monitoramento-pragas/pontos/${leitura.armadilha.pontoMonitoramentoId}`} label="Voltar" />
        <ExcluirLeituraForm leituraId={leitura.id} />
      </div>

      <h1 className="text-xl font-semibold text-neutral-900">Editar leitura</h1>

      <LeituraForm
        action={atualizarLeituraArmadilha.bind(null, leitura.id)}
        armadilhaRotulo={leitura.armadilha.rotulo}
        defaultValues={{ data: leitura.data.toISOString().slice(0, 10), quantidade: leitura.quantidade.toString() }}
      />
    </div>
  );
}
