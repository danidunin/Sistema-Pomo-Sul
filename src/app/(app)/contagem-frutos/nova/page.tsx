import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ContagemForm } from "@/components/contagem-frutos/contagem-form";
import { criarContagemFrutos } from "@/actions/contagem-frutos";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaContagemPage({
  searchParams,
}: {
  searchParams: Promise<{ talhaoId?: string }>;
}) {
  const { talhaoId } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();
  const [talhoes, metasSafra] = await Promise.all([
    db.talhao.findMany({
      where: { propriedadeId },
      orderBy: { nomeCodinome: "asc" },
      select: { id: true, nomeCodinome: true, areaHa: true, numeroPlantas: true, especie: true, variedade: true },
    }),
    db.metaSafra.findMany({
      where: { talhao: { propriedadeId } },
      select: { talhaoId: true, safra: true, metaFrutosPorPlanta: true },
    }),
  ]);

  if (talhoes.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <VoltarLink href="/contagem-frutos" label="Voltar" />
        <h1 className="text-xl font-semibold text-neutral-900">Nova contagem de frutos</h1>
        <p className="text-sm text-neutral-500">Cadastre um talhão antes de registrar uma contagem.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/contagem-frutos" label="Voltar" />
      <h1 className="text-xl font-semibold text-neutral-900">Nova contagem de frutos</h1>
      <ContagemForm
        action={criarContagemFrutos}
        talhoes={talhoes.map((t) => ({
          id: t.id,
          nome: t.nomeCodinome,
          areaHa: t.areaHa ? Number(t.areaHa) : null,
          numeroPlantas: t.numeroPlantas,
          especie: t.especie,
          variedade: t.variedade,
        }))}
        metasSafra={metasSafra.map((m) => ({
          talhaoId: m.talhaoId,
          safra: m.safra,
          metaFrutosPorPlanta: Number(m.metaFrutosPorPlanta),
        }))}
        defaultValues={talhaoId ? { talhaoId } : undefined}
        submitLabel="Registrar contagem"
      />
    </div>
  );
}
