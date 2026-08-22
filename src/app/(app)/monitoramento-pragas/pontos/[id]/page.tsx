import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS } from "@/lib/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function DetalhePontoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const ponto = await db.pontoMonitoramento.findUnique({
    where: { id },
    include: { armadilhas: { orderBy: { rotulo: "asc" }, include: { talhao: { select: { nomeCodinome: true } } } } },
  });
  if (!ponto || ponto.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <VoltarLink href="/monitoramento-pragas/pontos" label="Voltar" />
        <Link href={`/monitoramento-pragas/pontos/${ponto.id}/editar`} className="text-sm font-medium text-green-700">
          Editar ponto
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{ponto.nome}</h1>
        <p className="text-sm text-neutral-500">
          {TIPO_PRAGA_LABELS[ponto.tipoPraga]} · safra {ponto.safra} {!ponto.ativo && "· inativo"}
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-700">Armadilhas</p>
          <Link href={`/monitoramento-pragas/armadilhas/novo?pontoId=${ponto.id}`} className="text-sm font-medium text-green-700">
            + Nova armadilha
          </Link>
        </div>
        {ponto.armadilhas.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma armadilha cadastrada neste ponto ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ponto.armadilhas.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">
                  {a.rotulo} <span className="text-neutral-400">· {a.talhao.nomeCodinome}</span>
                  {!a.ativo && <span className="text-neutral-400"> (inativa)</span>}
                </span>
                <Link href={`/monitoramento-pragas/armadilhas/${a.id}/editar`} className="text-green-700">
                  Editar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
