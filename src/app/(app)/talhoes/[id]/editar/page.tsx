import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TalhaoForm } from "@/components/talhoes/talhao-form";
import { atualizarTalhao } from "@/actions/talhoes";

export default async function EditarTalhaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const talhao = await db.talhao.findUnique({ where: { id } });

  if (!talhao) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Editar talhão</h1>
      <TalhaoForm
        action={atualizarTalhao.bind(null, id)}
        submitLabel="Salvar alterações"
        defaultValues={{
          nomeCodinome: talhao.nomeCodinome,
          areaHa: talhao.areaHa?.toString() ?? "",
          cultura: talhao.cultura ?? "",
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
