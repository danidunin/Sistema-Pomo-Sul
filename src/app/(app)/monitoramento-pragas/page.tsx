import Link from "next/link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS, statusAtualPonto } from "@/lib/pragas";
import { StatusPragaBadge } from "@/components/pragas/status-praga-badge";
import { ExportarBotoes } from "@/components/relatorios/exportar-botoes";
import { formatarData } from "@/lib/format";
import { TipoPraga } from "@/generated/prisma/enums";
import { ehValorDoEnum } from "@/lib/enum";

export default async function MonitoramentoPragasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipoPraga?: string; safra?: string }>;
}) {
  const { tipoPraga, safra } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();
  const tipoPragaValido = tipoPraga && ehValorDoEnum(TipoPraga, tipoPraga) ? (tipoPraga as TipoPraga) : undefined;

  const pontos = await db.pontoMonitoramento.findMany({
    where: {
      propriedadeId,
      ...(tipoPragaValido ? { tipoPraga: tipoPragaValido } : {}),
      ...(safra ? { safra } : {}),
    },
    orderBy: [{ safra: "desc" }, { tipoPraga: "asc" }, { nome: "asc" }],
    // Sem filtro de `ativo` nas armadilhas: uma leitura é um fato histórico e não
    // deve sair do cálculo da média só porque a armadilha foi desativada depois.
    // Desativar uma armadilha só a remove da grade de lançamento de NOVAS leituras.
    include: { armadilhas: { include: { leituras: true } } },
  });

  const linhas = pontos.map((ponto) => {
    const leiturasBrutas = ponto.armadilhas.flatMap((a) => a.leituras.map((l) => ({ data: l.data, quantidade: l.quantidade })));
    return { ponto, status: statusAtualPonto(ponto.tipoPraga, leiturasBrutas) };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Monitoramento de Pragas</h1>
        <Link
          href="/monitoramento-pragas/nova"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova leitura
        </Link>
      </div>

      <ExportarBotoes recurso="pragas" />

      <div className="flex gap-2">
        <Link href="/monitoramento-pragas/pontos" className="text-sm font-medium text-green-700">
          Pontos de monitoramento
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/monitoramento-pragas/armadilhas" className="text-sm font-medium text-green-700">
          Armadilhas
        </Link>
      </div>

      {linhas.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum ponto de monitoramento cadastrado ainda.{" "}
          <Link href="/monitoramento-pragas/pontos/novo" className="font-medium text-green-700">
            Cadastrar o primeiro ponto
          </Link>
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {linhas.map(({ ponto, status }) => (
            <Link
              key={ponto.id}
              href={`/monitoramento-pragas/pontos/${ponto.id}`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{ponto.nome}</p>
                <p className="text-xs text-neutral-500">
                  {TIPO_PRAGA_LABELS[ponto.tipoPraga]} · safra {ponto.safra}
                  {status && ` · última leitura ${formatarData(status.data)}`}
                </p>
              </div>
              {status ? <StatusPragaBadge nivel={status.nivel} /> : <span className="text-xs text-neutral-400">Sem leitura</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
