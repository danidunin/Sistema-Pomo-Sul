import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ContagemForm } from "@/components/contagem-frutos/contagem-form";
import { ExcluirContagemForm } from "@/components/contagem-frutos/excluir-contagem-form";
import { atualizarContagemFrutos } from "@/actions/contagem-frutos";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function ContagemDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const contagem = await db.contagemFrutos.findUnique({ where: { id }, include: { talhao: true, metaSafra: true } });
  if (!contagem || contagem.talhao.propriedadeId !== propriedadeId) notFound();

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <VoltarLink href="/contagem-frutos" label="Voltar" />
        <ExcluirContagemForm contagemId={contagem.id} />
      </div>

      <h1 className="text-xl font-semibold text-neutral-900">
        Contagem de frutos — {contagem.talhao.nomeCodinome}
      </h1>

      <ContagemForm
        action={atualizarContagemFrutos.bind(null, contagem.id)}
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
        defaultValues={{
          talhaoId: contagem.talhaoId,
          safra: contagem.metaSafra.safra,
          data: contagem.data.toISOString().slice(0, 10),
          metaFrutosPorPlanta: contagem.metaSafra.metaFrutosPorPlanta.toString(),
          numeroPlantasAmostradas: contagem.numeroPlantasAmostradas.toString(),
          frutosContados: contagem.frutosContados.toString(),
          areaHa: contagem.areaHa.toString(),
          pesoMedioFrutoG: contagem.pesoMedioFrutoG.toString(),
          observacoes: contagem.observacoes ?? "",
        }}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
