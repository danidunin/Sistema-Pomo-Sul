import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import {
  agruparContagensPorQuadra,
  calcularEstimativaSafra,
  type ContagemParaAgrupar,
} from "@/lib/contagem-frutos";
import { QuadraResumoConteudo } from "@/components/contagem-frutos/quadra-resumo";
import { formatarData } from "@/lib/format";
import { PeriodoPicker } from "@/components/historico/periodo-picker";
import { VoltarLink } from "@/components/nav/voltar-link";
import { Card } from "@/components/ui/card";

const formatoKg = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const formatoNumero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export default async function QuadraContagemFrutosPage({
  params,
  searchParams,
}: {
  params: Promise<{ talhaoId: string }>;
  searchParams: Promise<{ safra?: string; mesAno?: string }>;
}) {
  const { talhaoId } = await params;
  const { safra, mesAno } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();
  if (!safra) notFound();

  const contagens = await db.contagemFrutos.findMany({
    where: { propriedadeId, talhaoId, metaSafra: { safra } },
    include: {
      talhao: { select: { nomeCodinome: true, numeroPlantas: true } },
      metaSafra: { select: { safra: true, metaFrutosPorPlanta: true } },
    },
    orderBy: { data: "desc" },
  });
  if (contagens.length === 0) notFound();

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
  const grupo = agruparContagensPorQuadra(paraAgrupar)[0];

  const [anoStr, mesStr] = mesAno?.split("-") ?? [];
  const ano = anoStr ? Number(anoStr) : undefined;
  const mes = mesStr ? Number(mesStr) : undefined;
  const contagensFiltradas =
    mes && ano
      ? contagens.filter((c) => c.data >= new Date(ano, mes - 1, 1) && c.data < new Date(ano, mes, 1))
      : contagens;

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={`/contagem-frutos?safra=${encodeURIComponent(safra)}`} label="Voltar" />

      <Card padding="none" className="overflow-hidden">
        <QuadraResumoConteudo grupo={grupo} />
      </Card>

      <div className="flex items-center justify-between gap-2">
        <form className="flex flex-1 gap-2">
          <input type="hidden" name="safra" value={safra} />
          <PeriodoPicker valorInicial={mesAno} />
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            Filtrar
          </button>
        </form>
        <Link
          href={`/contagem-frutos/nova?talhaoId=${talhaoId}&safra=${encodeURIComponent(safra)}`}
          className="whitespace-nowrap rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova contagem
        </Link>
      </div>

      {contagensFiltradas.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma contagem neste período.</p>
      ) : (
        <Card padding="none" className="overflow-hidden">
          {contagensFiltradas.map((c) => {
            const estimativa = calcularEstimativaSafra({
              metaFrutosPorPlanta: Number(c.metaSafra.metaFrutosPorPlanta),
              numeroPlantasAmostradas: c.numeroPlantasAmostradas,
              frutosContados: c.frutosContados,
              areaHa: Number(c.areaHa),
              plantasPorHectare: Number(c.plantasPorHectare),
              pesoMedioFrutoG: Number(c.pesoMedioFrutoG),
            });
            return (
              <Link
                key={c.id}
                href={`/contagem-frutos/${c.id}`}
                className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900">{formatarData(c.data)}</p>
                  <p className="text-xs text-neutral-500">
                    Média {formatoNumero.format(estimativa.mediaFrutosPorPlanta)} de meta{" "}
                    {formatoNumero.format(Number(c.metaSafra.metaFrutosPorPlanta))}
                  </p>
                </div>
                <span className="text-sm font-medium text-neutral-700">
                  {formatoKg.format(estimativa.estimativaSafraKg)} kg
                </span>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
