import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { RevisaoForm } from "@/components/maquinas/revisao-form";
import { atualizarRevisao } from "@/actions/maquinas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarRevisaoPage({
  params,
}: {
  params: Promise<{ id: string; revisaoId: string }>;
}) {
  const { id, revisaoId } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const [maquina, revisao] = await Promise.all([
    db.maquina.findUnique({ where: { id } }),
    db.revisao.findUnique({ where: { id: revisaoId } }),
  ]);

  if (!maquina || maquina.propriedadeId !== propriedadeId) notFound();
  if (!revisao || revisao.maquinaId !== maquina.id) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={`/maquinas/${maquina.id}/revisoes`} label="Voltar às revisões" />
      <h1 className="text-xl font-semibold text-neutral-900">Editar revisão — {maquina.nome}</h1>
      <RevisaoForm
        action={atualizarRevisao.bind(null, maquina.id, revisao.id)}
        submitLabel="Salvar alterações"
        defaultValues={{
          data: revisao.data.toISOString().slice(0, 10),
          servicoRealizado: revisao.servicoRealizado,
          horimetro: revisao.horimetro.toString(),
          observacoes: revisao.observacoes ?? "",
        }}
      />
    </div>
  );
}
