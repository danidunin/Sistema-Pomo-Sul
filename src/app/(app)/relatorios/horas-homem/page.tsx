import { db } from "@/lib/db";
import { buscarHorasHomem } from "@/lib/relatorios";
import { formatarData } from "@/lib/format";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TIPO_OPERACAO_LABELS } from "@/lib/operacoes";
import { ExportarBotoes } from "@/components/relatorios/exportar-botoes";
import type { TipoOperacao } from "@/generated/prisma/enums";

type Filtros = {
  dataInicio?: string;
  dataFim?: string;
  talhaoId?: string;
  cultura?: string;
  tipoAtividadeId?: string;
  tipoTratamento?: string;
};

export default async function RelatorioHorasHomemPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const filtros = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const [talhoes, tiposAtividade, culturas, { linhas, total }] = await Promise.all([
    db.talhao.findMany({
      where: { propriedadeId },
      orderBy: { nomeCodinome: "asc" },
      select: { id: true, nomeCodinome: true },
    }),
    db.tipoAtividade.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    db.talhao
      .findMany({ where: { propriedadeId, especie: { not: null } }, distinct: ["especie"], select: { especie: true } })
      .then((r) => r.map((t) => t.especie!).sort()),
    buscarHorasHomem(propriedadeId, {
      ...filtros,
      tipoTratamento: filtros.tipoTratamento as TipoOperacao | undefined,
    }),
  ]);

  const queryString = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Relatório de Hora-Homem</h1>

      <form className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Data início</label>
          <input
            type="date"
            name="dataInicio"
            defaultValue={filtros.dataInicio ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Data fim</label>
          <input
            type="date"
            name="dataFim"
            defaultValue={filtros.dataFim ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Talhão</label>
          <select
            name="talhaoId"
            defaultValue={filtros.talhaoId ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {talhoes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nomeCodinome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Cultura</label>
          <select
            name="cultura"
            defaultValue={filtros.cultura ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {culturas.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Atividade</label>
          <select
            name="tipoAtividadeId"
            defaultValue={filtros.tipoAtividadeId ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {tiposAtividade.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Tratamento</label>
          <select
            name="tipoTratamento"
            defaultValue={filtros.tipoTratamento ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(TIPO_OPERACAO_LABELS).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            Filtrar
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
        <div>
          <p className="text-xs text-neutral-500">Total de horas-homem</p>
          <p className="text-2xl font-semibold text-neutral-900">{total.toLocaleString("pt-BR")}h</p>
        </div>
        <ExportarBotoes recurso="horas-homem" filtros={queryString} />
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {linhas.length === 0 && <p className="p-4 text-sm text-neutral-500">Nenhum registro encontrado.</p>}
        {linhas.map((l) => (
          <div
            key={`${l.origem}-${l.id}`}
            className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0"
          >
            <div>
              <p className="text-sm text-neutral-900">
                {l.descricao} · {l.numeroPessoas} pessoa{l.numeroPessoas === 1 ? "" : "s"} ×{" "}
                {l.horasPorPessoa.toLocaleString("pt-BR")}h
              </p>
              <p className="text-xs text-neutral-500">
                {l.origem} · {l.talhao} · {formatarData(l.data)}
              </p>
            </div>
            <span className="text-sm font-medium text-neutral-900">{l.horas.toLocaleString("pt-BR")}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}
