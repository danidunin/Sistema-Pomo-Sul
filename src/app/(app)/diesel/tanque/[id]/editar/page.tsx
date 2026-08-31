import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TanqueForm } from "@/components/diesel/tanque-form";
import { atualizarTanqueDiesel } from "@/actions/diesel";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarTanquePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();
  const tanque = await db.tanqueDiesel.findUnique({ where: { id } });

  if (!tanque || tanque.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/diesel" label="Voltar ao Controle de Diesel" />
      <h1 className="text-xl font-semibold text-neutral-900">Editar tanque</h1>
      <TanqueForm
        action={atualizarTanqueDiesel.bind(null, id)}
        submitLabel="Salvar alterações"
        exibirEstoqueAtual={false}
        defaultValues={{
          nome: tanque.nome,
          capacidadeLitros: tanque.capacidadeLitros.toString(),
          estoqueMinimoLitros: tanque.estoqueMinimoLitros.toString(),
        }}
      />
    </div>
  );
}
