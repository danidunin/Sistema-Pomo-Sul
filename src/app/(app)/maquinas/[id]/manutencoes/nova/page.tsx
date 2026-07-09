import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { NovaManutencaoForm } from "@/components/maquinas/nova-manutencao-form";

export default async function NovaManutencaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const maquina = await db.maquina.findUnique({ where: { id } });

  if (!maquina) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Nova manutenção — {maquina.nome}</h1>
      <NovaManutencaoForm maquinaId={maquina.id} />
    </div>
  );
}
