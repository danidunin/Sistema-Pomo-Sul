import Link from "next/link";
import { db } from "@/lib/db";
import { TIPO_OPERACAO_LABELS } from "@/lib/operacoes";
import { formatarData } from "@/lib/format";

export default async function OperacoesPage() {
  const operacoes = await db.operacaoAgricola.findMany({
    orderBy: { data: "desc" },
    include: { talhao: true, produtos: { include: { produto: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Operações Agrícolas</h1>
        <Link
          href="/operacoes/nova"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova operação
        </Link>
      </div>

      {operacoes.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma operação registrada ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {operacoes.map((operacao) => (
            <Link
              key={operacao.id}
              href={`/operacoes/${operacao.id}`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {TIPO_OPERACAO_LABELS[operacao.tipo]} · {operacao.talhao.nomeCodinome}
                </p>
                <p className="text-xs text-neutral-500">
                  {operacao.produtos.map((item) => item.produto.nome).join(", ")}
                </p>
              </div>
              <span className="text-xs text-neutral-500">{formatarData(operacao.data)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
