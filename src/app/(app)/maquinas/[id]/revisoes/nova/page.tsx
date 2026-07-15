import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { RevisaoForm } from "@/components/maquinas/revisao-form";
import { criarRevisao } from "@/actions/maquinas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaRevisaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();
  const maquina = await db.maquina.findUnique({ where: { id } });

  if (!maquina || maquina.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={`/maquinas/${maquina.id}/revisoes`} label="Voltar às revisões" />
      <h1 className="text-xl font-semibold text-neutral-900">Nova revisão — {maquina.nome}</h1>
      <RevisaoForm action={criarRevisao.bind(null, maquina.id)} submitLabel="Registrar revisão" />
    </div>
  );
}
