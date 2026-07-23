import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { MaquinaForm } from "@/components/maquinas/maquina-form";
import { atualizarMaquina } from "@/actions/maquinas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarMaquinaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();
  const maquina = await db.maquina.findUnique({ where: { id } });

  if (!maquina || maquina.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={`/maquinas/${maquina.id}`} label="Voltar à máquina" />
      <h1 className="text-xl font-semibold text-neutral-900">Editar máquina</h1>
      <MaquinaForm
        action={atualizarMaquina.bind(null, id)}
        submitLabel="Salvar alterações"
        defaultValues={{
          nome: maquina.nome,
          marca: maquina.marca ?? "",
          modelo: maquina.modelo ?? "",
          ano: maquina.ano?.toString() ?? "",
          horimetroAtual: maquina.horimetroAtual?.toString() ?? "",
          observacoes: maquina.observacoes ?? "",
          fotoUrl: maquina.fotoUrl ?? "",
        }}
      />
    </div>
  );
}
