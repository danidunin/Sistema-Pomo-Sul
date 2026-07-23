import Link from "next/link";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ExportarBotoes } from "@/components/relatorios/exportar-botoes";

export default async function OperadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; status?: string; resultado?: string }>;
}) {
  const { busca, status, resultado } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const where: Prisma.OperadorWhereInput = { propriedadeId };
  if (busca) {
    where.OR = [
      { nomeCompleto: { contains: busca, mode: "insensitive" } },
      { apelido: { contains: busca, mode: "insensitive" } },
      { equipe: { contains: busca, mode: "insensitive" } },
      { funcao: { contains: busca, mode: "insensitive" } },
    ];
  }
  if (status === "ativos") where.ativo = true;
  if (status === "inativos") where.ativo = false;

  const operadores = await db.operador.findMany({ where, orderBy: { nomeCompleto: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Operadores</h1>
        <Link
          href="/operadores/novo"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Novo operador
        </Link>
      </div>

      <ExportarBotoes recurso="operadores" />

      {resultado === "excluido" && (
        <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">Operador excluído.</p>
      )}
      {resultado === "inativado" && (
        <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Este operador já tinha tratamentos registrados, então foi marcado como inativo em vez de
          excluído, para não perder esse histórico. Ele some das listas de novos lançamentos.
        </p>
      )}

      <form className="flex gap-2">
        <input
          type="text"
          name="busca"
          defaultValue={busca}
          placeholder="Buscar por nome, apelido, equipe ou função..."
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
        <select
          name="status"
          defaultValue={status ?? "todos"}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="todos">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
        >
          Filtrar
        </button>
      </form>

      {operadores.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum operador encontrado.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {operadores.map((operador) => (
            <Link
              key={operador.id}
              href={`/operadores/${operador.id}`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {operador.nomeCompleto}
                  {operador.apelido && <span className="text-neutral-500"> ({operador.apelido})</span>}
                </p>
                <p className="text-xs text-neutral-500">
                  {[operador.funcao, operador.equipe].filter(Boolean).join(" · ") || "Sem detalhes"}
                </p>
              </div>
              {!operador.ativo && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                  Inativo
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
