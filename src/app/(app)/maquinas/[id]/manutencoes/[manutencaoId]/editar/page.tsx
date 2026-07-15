import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ManutencaoForm } from "@/components/maquinas/manutencao-form";
import { atualizarManutencao } from "@/actions/maquinas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarManutencaoPage({
  params,
}: {
  params: Promise<{ id: string; manutencaoId: string }>;
}) {
  const { id, manutencaoId } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const [maquina, manutencao] = await Promise.all([
    db.maquina.findUnique({ where: { id } }),
    db.manutencao.findUnique({ where: { id: manutencaoId } }),
  ]);

  if (!maquina || maquina.propriedadeId !== propriedadeId) notFound();
  if (!manutencao || manutencao.maquinaId !== maquina.id) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={`/maquinas/${maquina.id}`} label="Voltar à máquina" />
      <h1 className="text-xl font-semibold text-neutral-900">Editar manutenção — {maquina.nome}</h1>
      <ManutencaoForm
        action={atualizarManutencao.bind(null, maquina.id, manutencao.id)}
        submitLabel="Salvar alterações"
        defaultValues={{
          data: manutencao.data.toISOString().slice(0, 10),
          servicoRealizado: manutencao.servicoRealizado,
          tiposConserto: manutencao.tiposConserto,
          pecasUtilizadas: manutencao.pecasUtilizadas ?? "",
          valor: manutencao.valor?.toString() ?? "",
          mecanico: manutencao.mecanico ?? "",
          observacoes: manutencao.observacoes ?? "",
        }}
      />
    </div>
  );
}
