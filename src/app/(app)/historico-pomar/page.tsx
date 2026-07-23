import Link from "next/link";
import { db } from "@/lib/db";
import { buscarVisitas } from "@/lib/historico";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { Timeline } from "@/components/historico/timeline";
import { PeriodoPicker } from "@/components/historico/periodo-picker";

const POR_PAGINA = 20;

export default async function HistoricoPomarPage({
  searchParams,
}: {
  searchParams: Promise<{ talhaoId?: string; mesAno?: string; pagina?: string }>;
}) {
  const { talhaoId, mesAno, pagina: paginaStr } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const [anoStr, mesStr] = mesAno?.split("-") ?? [];
  const ano = anoStr ? Number(anoStr) : undefined;
  const mes = mesStr ? Number(mesStr) : undefined;
  const paginaNumero = Number(paginaStr);
  const pagina = Number.isFinite(paginaNumero) && paginaNumero > 1 ? Math.floor(paginaNumero) : 1;

  const [talhoes, { itens: visitas, total }] = await Promise.all([
    db.talhao.findMany({
      where: { propriedadeId },
      orderBy: { nomeCodinome: "asc" },
      select: { id: true, nomeCodinome: true },
    }),
    buscarVisitas(
      {
        ...(talhaoId ? { talhaoId } : { propriedadeId }),
        ...(mes && ano ? { mes, ano } : {}),
      },
      { pagina, porPagina: POR_PAGINA },
    ),
  ]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  function hrefPagina(p: number) {
    const params = new URLSearchParams();
    if (talhaoId) params.set("talhaoId", talhaoId);
    if (mesAno) params.set("mesAno", mesAno);
    if (p > 1) params.set("pagina", String(p));
    const query = params.toString();
    return `/historico-pomar${query ? `?${query}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Histórico do Pomar</h1>
        <Link
          href={`/historico-pomar/nova${talhaoId ? `?talhaoId=${talhaoId}` : ""}`}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova visita
        </Link>
      </div>

      <p className="text-sm text-neutral-500">
        Diário de campo: as visitas realizadas ao pomar, com data, fotos e observações.
      </p>

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

      <Timeline itens={visitas} mostrarTalhao={!talhaoId} />

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-4">
          <Link
            href={hrefPagina(pagina - 1)}
            className={`rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 ${
              pagina <= 1 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            ← Anterior
          </Link>
          <span className="text-sm text-neutral-500">
            Página {pagina} de {totalPaginas}
          </span>
          <Link
            href={hrefPagina(pagina + 1)}
            className={`rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 ${
              pagina >= totalPaginas ? "pointer-events-none opacity-40" : ""
            }`}
          >
            Próxima →
          </Link>
        </div>
      )}
    </div>
  );
}
