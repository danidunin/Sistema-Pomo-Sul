import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TalhaoForm } from "@/components/talhoes/talhao-form";
import { atualizarTalhao } from "@/actions/talhoes";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarTalhaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();
  const talhao = await db.talhao.findUnique({ where: { id } });

  if (!talhao || talhao.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={`/talhoes/${talhao.id}`} label="Voltar ao talhão" />
      <h1 className="text-xl font-semibold text-neutral-900">Editar talhão</h1>
      <TalhaoForm
        action={atualizarTalhao.bind(null, id)}
        submitLabel="Salvar alterações"
        defaultValues={{
          nomeCodinome: talhao.nomeCodinome,
          areaHa: talhao.areaHa?.toString() ?? "",
          especie: talhao.especie ?? "",
          variedade: talhao.variedade ?? "",
          portaEnxerto: talhao.portaEnxerto ?? "",
          anoPlantio: talhao.anoPlantio?.toString() ?? "",
          espacamento: talhao.espacamento ?? "",
          numeroPlantas: talhao.numeroPlantas?.toString() ?? "",
          observacoes: talhao.observacoes ?? "",
        }}
      />
    </div>
  );
}
