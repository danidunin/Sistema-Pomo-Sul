import Link from "next/link";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ExportarBotoes } from "@/components/relatorios/exportar-botoes";

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; resultado?: string }>;
}) {
  const { status, resultado } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const where: Prisma.ProdutoWhereInput = { propriedadeId };
  if (status === "ativos") where.ativo = true;
  if (status === "inativos") where.ativo = false;

  const produtos = await db.produto.findMany({ where, orderBy: { nome: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-neutral-900">Estoque</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/estoque/movimentacoes/nova?tipo=entrada"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            + Entrada
          </Link>
          <Link
            href="/estoque/movimentacoes/nova?tipo=saida"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            + Saída
          </Link>
          <Link
            href="/estoque/produtos/novo"
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
          >
            + Novo produto
          </Link>
        </div>
      </div>

      <ExportarBotoes recurso="estoque" />

      {resultado === "excluido" && (
        <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">Produto excluído.</p>
      )}
      {resultado === "inativado" && (
        <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Este produto já tinha movimentações ou uso em tratamentos registrados, então foi marcado como inativo em vez
          de excluído, para não perder esse histórico. Ele some das listas de novos lançamentos.
        </p>
      )}

      <form className="flex gap-2">
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

      {produtos.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum produto encontrado.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {produtos.map((produto) => (
            <Link
              key={produto.id}
              href={`/estoque/produtos/${produto.id}/editar`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{produto.nome}</p>
                {!produto.unidadeDosagem && (
                  <p className="text-xs text-amber-600">Sem unidade de dosagem definida</p>
                )}
                {produto.observacoes && (
                  <p className="text-xs text-neutral-500">{produto.observacoes}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-700">
                  {produto.quantidadeDisponivel.toString()} {produto.unidade}
                </span>
                {!produto.ativo && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">Inativo</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
