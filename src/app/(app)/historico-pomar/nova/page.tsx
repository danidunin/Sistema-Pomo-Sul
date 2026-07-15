import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { VisitaForm } from "@/components/historico/visita-form";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaVisitaPage({
  searchParams,
}: {
  searchParams: Promise<{ talhaoId?: string }>;
}) {
  const { talhaoId } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();
  const talhoes = await db.talhao.findMany({
    where: { propriedadeId },
    orderBy: { nomeCodinome: "asc" },
    select: { id: true, nomeCodinome: true },
  });

  if (talhoes.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <VoltarLink href="/historico-pomar" label="Voltar ao histórico" />
        <h1 className="text-xl font-semibold text-neutral-900">Nova visita de campo</h1>
        <p className="text-sm text-neutral-500">Cadastre um talhão antes de registrar uma visita.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/historico-pomar" label="Voltar ao histórico" />
      <h1 className="text-xl font-semibold text-neutral-900">Nova visita de campo</h1>
      <VisitaForm
        talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nomeCodinome }))}
        talhaoIdInicial={talhaoId}
      />
    </div>
  );
}
