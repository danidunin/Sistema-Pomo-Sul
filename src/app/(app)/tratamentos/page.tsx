import Link from "next/link";
import { db } from "@/lib/db";
import { TIPO_OPERACAO_LABELS } from "@/lib/operacoes";
import { UNIDADE_DOSAGEM_LABELS } from "@/lib/concentracao";
import { formatarData } from "@/lib/format";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ExportarBotoes } from "@/components/relatorios/exportar-botoes";

export default async function OperacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ talhaoId?: string }>;
}) {
  const { talhaoId } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const talhoes = await db.talhao.findMany({
    where: { propriedadeId },
    orderBy: { nomeCodinome: "asc" },
    select: { id: true, nomeCodinome: true },
  });

  const talhaoSelecionado = talhaoId && talhoes.some((t) => t.id === talhaoId) ? talhaoId : null;

  const operacoes = await db.operacaoAgricola.findMany({
    where: talhaoSelecionado ? { talhaoId: talhaoSelecionado } : { talhao: { propriedadeId } },
    orderBy: [{ data: "desc" }, { createdAt: "asc" }],
    include: {
      talhao: true,
      produtos: { include: { produto: true } },
    },
  });

  // Agrupa por data e numera as aplicações do dia em ordem cronológica de lançamento.
  const grupos = new Map<string, typeof operacoes>();
  for (const operacao of operacoes) {
    const chave = operacao.data.toISOString().slice(0, 10);
    const grupo = grupos.get(chave) ?? [];
    grupo.push(operacao);
    grupos.set(chave, grupo);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Tratamentos Fitossanitários</h1>
        <Link
          href={`/tratamentos/nova${talhaoSelecionado ? `?talhaoId=${talhaoSelecionado}` : ""}`}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Novo tratamento
        </Link>
      </div>

      <ExportarBotoes recurso="tratamentos" />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <AbaTalhao href="/tratamentos" ativo={!talhaoSelecionado} label="Todos" />
        {talhoes.map((t) => (
          <AbaTalhao
            key={t.id}
            href={`/tratamentos?talhaoId=${t.id}`}
            ativo={talhaoSelecionado === t.id}
            label={t.nomeCodinome}
          />
        ))}
      </div>

      {operacoes.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum tratamento registrado ainda.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(grupos.entries()).map(([data, itensDoDia]) => (
            <div key={data} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-neutral-700">
                {formatarData(itensDoDia[0].data)}
              </h2>

              {itensDoDia.map((operacao, indice) => (
                <div key={operacao.id} className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
                  <Link
                    href={`/tratamentos/${operacao.id}`}
                    className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-4 py-2 hover:bg-neutral-100"
                  >
                    <span className="text-sm font-medium text-neutral-900">
                      Aplicação #{indice + 1} — {TIPO_OPERACAO_LABELS[operacao.tipo]}
                      {!talhaoSelecionado ? ` · ${operacao.talhao.nomeCodinome}` : ""}
                    </span>
                    {operacao.volumeCalda && (
                      <span className="text-xs text-neutral-500">{operacao.volumeCalda.toString()} L de calda</span>
                    )}
                  </Link>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-neutral-500">
                        <th className="px-4 py-2 font-normal">Produto</th>
                        <th className="px-4 py-2 font-normal">Concentração</th>
                        <th className="px-4 py-2 font-normal">Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operacao.produtos.map((item) => (
                        <tr key={item.id} className="border-t border-neutral-100">
                          <td className="px-4 py-2 text-neutral-900">{item.produto.nome}</td>
                          <td className="px-4 py-2 text-neutral-600">
                            {item.concentracao
                              ? `${item.concentracao.toString()} ${
                                  item.produto.unidadeDosagem
                                    ? UNIDADE_DOSAGEM_LABELS[item.produto.unidadeDosagem]
                                    : ""
                                }`
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-neutral-600">
                            {item.quantidade.toString()} {item.unidade}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AbaTalhao({ href, ativo, label }: { href: string; ativo: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium ${
        ativo
          ? "border-green-700 bg-green-700 text-white"
          : "border-neutral-300 bg-white text-neutral-700"
      }`}
    >
      {label}
    </Link>
  );
}
