import Link from "next/link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS } from "@/lib/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";
import { Card } from "@/components/ui/card";

export default async function PontosMonitoramentoPage({
  searchParams,
}: {
  searchParams: Promise<{ resultado?: string }>;
}) {
  const { resultado } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const pontos = await db.pontoMonitoramento.findMany({
    where: { propriedadeId },
    orderBy: [{ safra: "desc" }, { tipoPraga: "asc" }, { nome: "asc" }],
    include: { _count: { select: { armadilhas: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/monitoramento-pragas" label="Voltar" />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Pontos de Monitoramento</h1>
        <Link
          href="/monitoramento-pragas/pontos/novo"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Novo ponto
        </Link>
      </div>

      {resultado === "excluido" && <p className="text-sm text-green-700">Ponto excluído.</p>}
      {resultado === "inativado" && (
        <p className="text-sm text-amber-700">
          Este ponto já tem leitura registrada e não pode ser excluído — foi apenas desativado.
        </p>
      )}

      {pontos.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum ponto de monitoramento cadastrado ainda.</p>
      ) : (
        <Card padding="none" className="overflow-hidden">
          {pontos.map((p) => (
            <Link
              key={p.id}
              href={`/monitoramento-pragas/pontos/${p.id}`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {p.nome} {!p.ativo && <span className="text-xs font-normal text-neutral-400">(inativo)</span>}
                </p>
                <p className="text-xs text-neutral-500">
                  {TIPO_PRAGA_LABELS[p.tipoPraga]} · safra {p.safra} · {p._count.armadilhas} armadilha
                  {p._count.armadilhas === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
