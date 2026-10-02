import Link from "next/link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import {
  agruparContagensPorQuadra,
  ordenarGruposPorNomeQuadra,
  ordenarSafrasDesc,
  type ContagemParaAgrupar,
} from "@/lib/contagem-frutos";
import { QuadraResumoConteudo } from "@/components/contagem-frutos/quadra-resumo";
import { Card } from "@/components/ui/card";

export default async function ContagemFrutosPage({
  searchParams,
}: {
  searchParams: Promise<{ safra?: string }>;
}) {
  const { safra } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  // Só considera safras que ainda têm alguma contagem registrada — uma MetaSafra
  // pode ficar órfã (última contagem excluída, ou editada para outra safra) e
  // continuar no banco, o que faria a tela cair numa safra sem nenhum dado.
  const metasSafra = await db.metaSafra.findMany({
    where: { talhao: { propriedadeId }, contagens: { some: {} } },
    select: { safra: true },
    distinct: ["safra"],
  });
  const safras = ordenarSafrasDesc(metasSafra.map((m) => m.safra));
  const safraSelecionada = safra ?? safras[0];

  const contagens = safraSelecionada
    ? await db.contagemFrutos.findMany({
        where: { propriedadeId, metaSafra: { safra: safraSelecionada } },
        include: {
          talhao: { select: { nomeCodinome: true, numeroPlantas: true } },
          metaSafra: { select: { safra: true, metaFrutosPorPlanta: true } },
        },
      })
    : [];

  const paraAgrupar: ContagemParaAgrupar[] = contagens.map((c) => ({
    talhaoId: c.talhaoId,
    talhaoNome: c.talhao.nomeCodinome,
    numeroPlantasTalhao: c.talhao.numeroPlantas,
    safra: c.metaSafra.safra,
    metaFrutosPorPlanta: Number(c.metaSafra.metaFrutosPorPlanta),
    numeroPlantasAmostradas: c.numeroPlantasAmostradas,
    frutosContados: c.frutosContados,
    plantasPorHectare: Number(c.plantasPorHectare),
    pesoMedioFrutoG: Number(c.pesoMedioFrutoG),
    data: c.data,
  }));

  const grupos = ordenarGruposPorNomeQuadra(agruparContagensPorQuadra(paraAgrupar));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Contagem de Frutos / Estimativa de Safra</h1>
        <Link
          href={`/contagem-frutos/nova${safraSelecionada ? `?safra=${encodeURIComponent(safraSelecionada)}` : ""}`}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova contagem
        </Link>
      </div>

      {safras.length > 0 && (
        <form className="flex flex-wrap gap-2">
          <select
            name="safra"
            defaultValue={safraSelecionada}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            {safras.map((s) => (
              <option key={s} value={s}>
                safra {s}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            Filtrar
          </button>
        </form>
      )}

      {grupos.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma contagem registrada ainda.</p>
      ) : (
        <Card padding="none" className="overflow-hidden">
          {grupos.map((grupo) => (
            <Link
              key={`${grupo.talhaoId}::${grupo.safra}`}
              href={`/contagem-frutos/quadra/${grupo.talhaoId}?safra=${encodeURIComponent(grupo.safra)}`}
              className="block border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
            >
              <QuadraResumoConteudo grupo={grupo} />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
