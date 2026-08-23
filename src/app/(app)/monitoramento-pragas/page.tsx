import Link from "next/link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS, montarSecaoGrade } from "@/lib/pragas";
import { GradeExcelPraga } from "@/components/pragas/grade-excel";
import { ExportarBotoes } from "@/components/relatorios/exportar-botoes";
import { TipoPraga } from "@/generated/prisma/enums";

export default async function MonitoramentoPragasPage({
  searchParams,
}: {
  searchParams: Promise<{ safra?: string }>;
}) {
  const { safra: safraParam } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const safrasDisponiveis = await db.pontoMonitoramento.findMany({
    where: { propriedadeId },
    select: { safra: true },
    distinct: ["safra"],
    orderBy: { safra: "desc" },
  });
  const safraSelecionada =
    safraParam && safrasDisponiveis.some((s) => s.safra === safraParam) ? safraParam : safrasDisponiveis[0]?.safra;

  const pontos = safraSelecionada
    ? await db.pontoMonitoramento.findMany({
        where: { propriedadeId, safra: safraSelecionada },
        orderBy: [{ tipoPraga: "asc" }, { nome: "asc" }],
        // Sem filtro de `ativo` nas armadilhas: uma leitura é um fato histórico e não
        // deve sair da grade/média só porque a armadilha foi desativada depois.
        include: {
          armadilhas: {
            orderBy: { rotulo: "asc" },
            include: { leituras: { orderBy: { data: "asc" } } },
          },
        },
      })
    : [];

  // Uma seção por praga, na mesma ordem em que a planilha original as
  // organiza lado a lado (Grapholita, Moscas, Bonagota, Cydia) — aqui
  // empilhadas verticalmente pra caber numa tela.
  const secoesPorPraga = new Map<TipoPraga, typeof pontos>();
  for (const ponto of pontos) {
    const lista = secoesPorPraga.get(ponto.tipoPraga) ?? [];
    lista.push(ponto);
    secoesPorPraga.set(ponto.tipoPraga, lista);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-neutral-900">Monitoramento de Pragas</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/monitoramento-pragas/nova"
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
          >
            + Nova leitura
          </Link>
          <ExportarBotoes recurso="pragas" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {safrasDisponiveis.length > 1 && (
          <form className="flex items-center gap-2">
            <select
              name="safra"
              defaultValue={safraSelecionada}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              {safrasDisponiveis.map((s) => (
                <option key={s.safra} value={s.safra}>
                  safra {s.safra}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700">
              Ver
            </button>
          </form>
        )}
        <Link href="/monitoramento-pragas/pontos" className="text-sm font-medium text-green-700">
          Pontos de monitoramento
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/monitoramento-pragas/armadilhas" className="text-sm font-medium text-green-700">
          Armadilhas
        </Link>
      </div>

      {pontos.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum ponto de monitoramento cadastrado ainda.{" "}
          <Link href="/monitoramento-pragas/pontos/novo" className="font-medium text-green-700">
            Cadastrar o primeiro ponto
          </Link>
        </p>
      ) : (
        Array.from(secoesPorPraga.entries()).map(([tipoPraga, pontosDaPraga]) => (
          <GradeExcelPraga
            key={tipoPraga}
            titulo={`${TIPO_PRAGA_LABELS[tipoPraga]} · safra ${safraSelecionada}`}
            secao={montarSecaoGrade(pontosDaPraga)}
          />
        ))
      )}
    </div>
  );
}
