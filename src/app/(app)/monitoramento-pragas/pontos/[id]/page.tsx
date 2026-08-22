import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS, agruparMediaPorData, calcularSerieNivelControle, CORES_NIVEL } from "@/lib/pragas";
import { formatarData } from "@/lib/format";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function DetalhePontoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const ponto = await db.pontoMonitoramento.findUnique({
    where: { id },
    include: {
      armadilhas: {
        orderBy: { rotulo: "asc" },
        include: { talhao: { select: { nomeCodinome: true } }, leituras: { orderBy: { data: "desc" } } },
      },
    },
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

      <PontoHistorico ponto={ponto} />
    </div>
  );
}

function PontoHistorico({
  ponto,
}: {
  ponto: {
    tipoPraga: import("@/generated/prisma/enums").TipoPraga;
    armadilhas: { leituras: { id: string; data: Date; quantidade: number }[] }[];
  };
}) {
  const leiturasBrutas = ponto.armadilhas.flatMap((a) =>
    a.leituras.map((l) => ({ data: l.data, quantidade: l.quantidade })),
  );
  const porData = agruparMediaPorData(leiturasBrutas);
  const serie = calcularSerieNivelControle(ponto.tipoPraga, porData);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-neutral-700">Histórico de leituras</p>
      {serie.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma leitura registrada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {[...serie].reverse().map((s) => (
            <li key={s.data.toISOString()} className="flex items-center justify-between text-sm">
              <span className="text-neutral-700">{formatarData(s.data)}</span>
              <span className="text-neutral-500">média {s.mediaAtual.toFixed(1)}</span>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${CORES_NIVEL[s.nivel].badge}`}>
                {CORES_NIVEL[s.nivel].texto}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
