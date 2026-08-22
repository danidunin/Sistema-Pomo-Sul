import Link from "next/link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS } from "@/lib/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function ArmadilhasPage() {
  const propriedadeId = await exigirPropriedadeAtual();

  const armadilhas = await db.armadilha.findMany({
    where: { pontoMonitoramento: { propriedadeId } },
    orderBy: [{ pontoMonitoramento: { safra: "desc" } }, { rotulo: "asc" }],
    include: { pontoMonitoramento: true, talhao: { select: { nomeCodinome: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/monitoramento-pragas" label="Voltar" />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Armadilhas</h1>
        <Link
          href="/monitoramento-pragas/armadilhas/novo"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova armadilha
        </Link>
      </div>

      {armadilhas.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma armadilha cadastrada ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {armadilhas.map((a) => (
            <Link
              key={a.id}
              href={`/monitoramento-pragas/armadilhas/${a.id}/editar`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {a.rotulo} {!a.ativo && <span className="text-xs font-normal text-neutral-400">(inativa)</span>}
                </p>
                <p className="text-xs text-neutral-500">
                  {a.talhao.nomeCodinome} · {TIPO_PRAGA_LABELS[a.pontoMonitoramento.tipoPraga]} · {a.pontoMonitoramento.nome} · safra{" "}
                  {a.pontoMonitoramento.safra}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
