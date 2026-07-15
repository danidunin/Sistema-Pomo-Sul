import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ManutencaoForm } from "@/components/maquinas/manutencao-form";
import { criarManutencao } from "@/actions/maquinas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaManutencaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();
  const maquina = await db.maquina.findUnique({ where: { id } });

  if (!maquina || maquina.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={`/maquinas/${maquina.id}`} label="Voltar à máquina" />
      <h1 className="text-xl font-semibold text-neutral-900">Nova manutenção — {maquina.nome}</h1>
      <ManutencaoForm action={criarManutencao.bind(null, maquina.id)} submitLabel="Registrar manutenção" />
    </div>
  );
}
