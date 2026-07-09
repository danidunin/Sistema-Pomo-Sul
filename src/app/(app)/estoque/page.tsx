import Link from "next/link";
import { db } from "@/lib/db";

export default async function EstoquePage() {
  const produtos = await db.produto.findMany({ orderBy: { nome: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Estoque</h1>
        <div className="flex gap-2">
          <Link
            href="/estoque/movimentacoes/nova"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            + Entrada
          </Link>
          <Link
            href="/estoque/produtos/novo"
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
          >
            + Novo produto
          </Link>
        </div>
      </div>

      {produtos.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum produto cadastrado ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {produtos.map((produto) => (
            <div
              key={produto.id}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{produto.nome}</p>
                {produto.observacoes && (
                  <p className="text-xs text-neutral-500">{produto.observacoes}</p>
                )}
              </div>
              <span className="text-sm text-neutral-700">
                {produto.quantidadeDisponivel.toString()} {produto.unidade}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
