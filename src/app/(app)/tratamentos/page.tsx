import Link from "next/link";
import { db } from "@/lib/db";
import { TIPO_OPERACAO_LABELS, TIPO_OPERACAO_LABELS_ABA, unidadeDosagemEfetiva, tiposParaAbas, validarTipoSelecionado } from "@/lib/operacoes";
import { UNIDADE_DOSAGEM_LABELS } from "@/lib/concentracao";
import { formatarData } from "@/lib/format";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ExportarBotoes } from "@/components/relatorios/exportar-botoes";
import { buscarChuvaRegistros, calcularAcumuladoPorTratamento } from "@/lib/chuva";
import { diasDesdeTratamento } from "@/lib/operacoes";
import { Card } from "@/components/ui/card";

export default async function OperacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ talhaoId?: string; tipo?: string }>;
}) {
  const { talhaoId, tipo } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const talhoes = await db.talhao.findMany({
    where: { propriedadeId },
    orderBy: { nomeCodinome: "asc" },
    select: { id: true, nomeCodinome: true },
  });

  const talhaoSelecionado = talhaoId && talhoes.some((t) => t.id === talhaoId) ? talhaoId : null;

  // Último tratamento fitossanitário de cada quadra, para o contador nas abas. Sempre da
  // propriedade inteira, mesmo com uma quadra selecionada, pra não mudar o que aparece nas abas.
  const ultimosTratamentos = await db.operacaoAgricola.groupBy({
    by: ["talhaoId"],
    where: { tipo: "FITOSSANITARIO", talhao: { propriedadeId } },
    _max: { data: true },
  });
  const agora = new Date();
  const diasDesdeUltimoPorTalhao = new Map(
    ultimosTratamentos
      .filter((g) => g._max.data)
      .map((g) => [g.talhaoId, diasDesdeTratamento(g._max.data as Date, agora)]),
  );

  const operacoesBase = await db.operacaoAgricola.findMany({
    where: talhaoSelecionado ? { talhaoId: talhaoSelecionado } : { talhao: { propriedadeId } },
    orderBy: [{ data: "desc" }, { createdAt: "asc" }],
    include: {
      talhao: true,
      produtos: { include: { produto: true } },
    },
  });

  const tiposComDados = talhaoSelecionado
    ? Array.from(new Set(operacoesBase.map((o) => o.tipo)))
    : [];
  const tiposAbas = talhaoSelecionado ? tiposParaAbas(tiposComDados) : [];
  const tipoSelecionado = talhaoSelecionado ? validarTipoSelecionado(tipo, tiposAbas) : null;

  const operacoes = tipoSelecionado
    ? operacoesBase.filter((o) => o.tipo === tipoSelecionado)
    : operacoesBase;

  const chuvas = await buscarChuvaRegistros(propriedadeId);
  const fitossanitarios = operacoesBase
    .filter((o) => o.tipo === "FITOSSANITARIO")
    .map((o) => ({ id: o.id, talhaoId: o.talhaoId, data: o.data, createdAt: o.createdAt }));
  const acumulados = calcularAcumuladoPorTratamento(
    fitossanitarios,
    chuvas.map((c) => ({ data: c.data, quantidadeMm: c.quantidadeMm.toString(), relacaoTratamentoDia: c.relacaoTratamentoDia })),
  );

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-neutral-900">Tratamentos Fitossanitários</h1>
        <div className="flex gap-2">
          <Link
            href="/tratamentos/resumo"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            Resumo do ciclo
          </Link>
          <Link
            href={`/tratamentos/nova${talhaoSelecionado ? `?talhaoId=${talhaoSelecionado}` : ""}`}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
          >
            + Novo tratamento
          </Link>
        </div>
      </div>

      <ExportarBotoes recurso="tratamentos" />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Aba href="/tratamentos" ativo={!talhaoSelecionado} label="Todos" />
        {talhoes.map((t) => (
          <Aba
            key={t.id}
            href={`/tratamentos?talhaoId=${t.id}`}
            ativo={talhaoSelecionado === t.id}
            label={
              diasDesdeUltimoPorTalhao.has(t.id)
                ? `${t.nomeCodinome} · ${diasDesdeUltimoPorTalhao.get(t.id)}d`
                : t.nomeCodinome
            }
          />
        ))}
      </div>

      {talhaoSelecionado && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Aba
            href={`/tratamentos?talhaoId=${talhaoSelecionado}`}
            ativo={!tipoSelecionado}
            label="Todos"
          />
          {tiposAbas.map((t) => (
            <Aba
              key={t}
              href={`/tratamentos?talhaoId=${talhaoSelecionado}&tipo=${t}`}
              ativo={tipoSelecionado === t}
              label={TIPO_OPERACAO_LABELS_ABA[t]}
            />
          ))}
        </div>
      )}

      {operacoes.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {tipoSelecionado
            ? "Nenhuma operação deste tipo nesta quadra."
            : "Nenhum tratamento registrado ainda."}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(grupos.entries()).map(([data, itensDoDia]) => (
            <div key={data} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-neutral-700">
                {formatarData(itensDoDia[0].data)}
              </h2>

              {itensDoDia.map((operacao, indice) => {
                const acumulado = acumulados.get(operacao.id) ?? 0;
                return (
                  <div key={operacao.id} className="flex flex-col gap-1">
                    {operacao.tipo === "FITOSSANITARIO" && acumulado > 0 && (
                      <p className="px-1 text-xs text-neutral-400">
                        🌧 {acumulado.toLocaleString("pt-BR")}mm acumulados desde a aplicação
                      </p>
                    )}
                    <Card padding="none" className="overflow-x-auto">
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
                            <th className="px-4 py-2 font-normal">
                              {operacao.tipo === "ADUBACAO" ? "Dose" : "Concentração"}
                            </th>
                            <th className="px-4 py-2 font-normal">Quantidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {operacao.produtos.map((item) => {
                            const unidadeDosagem = unidadeDosagemEfetiva(
                              operacao.tipo,
                              item.produto.unidadeDosagem,
                            );
                            return (
                            <tr key={item.id} className="border-t border-neutral-100">
                              <td className="px-4 py-2 text-neutral-900">{item.produto.nome}</td>
                              <td className="px-4 py-2 text-neutral-600">
                                {item.concentracao
                                  ? `${item.concentracao.toString()} ${
                                      unidadeDosagem ? UNIDADE_DOSAGEM_LABELS[unidadeDosagem] : ""
                                    }`
                                  : "—"}
                              </td>
                              <td className="px-4 py-2 text-neutral-600">
                                {item.quantidade.toString()} {item.unidade}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </Card>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Aba({ href, ativo, label }: { href: string; ativo: boolean; label: string }) {
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
