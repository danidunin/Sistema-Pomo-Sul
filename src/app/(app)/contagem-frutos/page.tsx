import Link from "next/link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { calcularEstimativaSafra } from "@/lib/contagem-frutos";
import { formatarData } from "@/lib/format";
import { PeriodoPicker } from "@/components/historico/periodo-picker";

const formatoKg = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const formatoNumero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

// Média ponderada pelo número de plantas amostradas em cada contagem — contagens
// com mais plantas amostradas são estatisticamente mais confiáveis e pesam mais
// no resultado final, em vez de todas as contagens contarem igual.
function mediaPonderada(pares: { valor: number; peso: number }[]): number {
  const pesoTotal = pares.reduce((soma, p) => soma + p.peso, 0);
  if (pesoTotal === 0) return 0;
  return pares.reduce((soma, p) => soma + p.valor * p.peso, 0) / pesoTotal;
}

export default async function ContagemFrutosPage({
  searchParams,
}: {
  searchParams: Promise<{ talhaoId?: string; mesAno?: string }>;
}) {
  const { talhaoId, mesAno } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const [anoStr, mesStr] = mesAno?.split("-") ?? [];
  const ano = anoStr ? Number(anoStr) : undefined;
  const mes = mesStr ? Number(mesStr) : undefined;

  const [talhoes, contagens] = await Promise.all([
    db.talhao.findMany({
      where: { propriedadeId },
      orderBy: { nomeCodinome: "asc" },
      select: { id: true, nomeCodinome: true },
    }),
    db.contagemFrutos.findMany({
      where: {
        propriedadeId,
        ...(talhaoId ? { talhaoId } : {}),
        ...(mes && ano
          ? { data: { gte: new Date(ano, mes - 1, 1), lt: new Date(ano, mes, 1) } }
          : {}),
      },
      include: { talhao: { select: { nomeCodinome: true } }, metaSafra: { select: { safra: true, metaFrutosPorPlanta: true } } },
      orderBy: { data: "desc" },
    }),
  ]);

  const linhas = contagens.map((c) => ({
    contagem: c,
    estimativa: calcularEstimativaSafra({
      metaFrutosPorPlanta: Number(c.metaSafra.metaFrutosPorPlanta),
      numeroPlantasAmostradas: c.numeroPlantasAmostradas,
      frutosContados: c.frutosContados,
      areaHa: Number(c.areaHa),
      plantasPorHectare: Number(c.plantasPorHectare),
      pesoMedioFrutoG: Number(c.pesoMedioFrutoG),
    }),
  }));

  const pesos = linhas.map((l) => l.contagem.numeroPlantasAmostradas);
  const mediaFinalFrutosPorPlanta = mediaPonderada(
    linhas.map((l, i) => ({ valor: l.estimativa.mediaFrutosPorPlanta, peso: pesos[i] })),
  );
  const plantasPorHectareMedia = mediaPonderada(
    linhas.map((l, i) => ({ valor: Number(l.contagem.plantasPorHectare), peso: pesos[i] })),
  );
  const pesoMedioFrutoGMedia = mediaPonderada(
    linhas.map((l, i) => ({ valor: Number(l.contagem.pesoMedioFrutoG), peso: pesos[i] })),
  );
  const produtividadeMediaEstimadaKgHa = (mediaFinalFrutosPorPlanta * plantasPorHectareMedia * pesoMedioFrutoGMedia) / 1000;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Contagem de Frutos / Estimativa de Safra</h1>
        <Link
          href={`/contagem-frutos/nova${talhaoId ? `?talhaoId=${talhaoId}` : ""}`}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova contagem
        </Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <select
          name="talhaoId"
          defaultValue={talhaoId ?? ""}
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="">Todos os talhões</option>
          {talhoes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nomeCodinome}
            </option>
          ))}
        </select>
        <PeriodoPicker valorInicial={mesAno} />
        <button
          type="submit"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
        >
          Filtrar
        </button>
      </form>

      {linhas.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma contagem registrada ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {linhas.map(({ contagem: c, estimativa }) => (
            <Link
              key={c.id}
              href={`/contagem-frutos/${c.id}`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {c.talhao.nomeCodinome} <span className="font-normal text-neutral-400">· safra {c.metaSafra.safra}</span>
                </p>
                <p className="text-xs text-neutral-500">
                  {formatarData(c.data)} · Média {formatoNumero.format(estimativa.mediaFrutosPorPlanta)} de meta{" "}
                  {formatoNumero.format(Number(c.metaSafra.metaFrutosPorPlanta))}
                </p>
              </div>
              <span className="text-sm font-medium text-neutral-700">
                {formatoKg.format(estimativa.estimativaSafraKg)} kg
              </span>
            </Link>
          ))}

          <div className="flex items-center justify-between bg-neutral-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900">Média consolidada</p>
              <p className="text-xs text-neutral-500">
                Média final de {formatoNumero.format(mediaFinalFrutosPorPlanta)} frutos/planta
              </p>
            </div>
            <span className="text-sm font-semibold text-neutral-900">
              {formatoKg.format(produtividadeMediaEstimadaKgHa)} kg/ha
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
