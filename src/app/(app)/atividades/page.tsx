import Link from "next/link";
import { db } from "@/lib/db";
import { formatarData } from "@/lib/format";

export default async function AtividadesPage() {
  const atividades = await db.atividade.findMany({
    orderBy: { data: "desc" },
    include: { tipoAtividade: true, talhao: true, funcionarios: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Atividades</h1>
        <Link
          href="/atividades/nova"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova atividade
        </Link>
      </div>

      {atividades.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma atividade registrada ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {atividades.map((atividade) => {
            const horasHomem = atividade.funcionarios.reduce(
              (soma, f) => soma + Number(f.horasTrabalhadas),
              0,
            );
            return (
              <Link
                key={atividade.id}
                href={`/atividades/${atividade.id}`}
                className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {atividade.tipoAtividade.nome} · {atividade.talhao.nomeCodinome}
                  </p>
                  <p className="text-xs text-neutral-500">{horasHomem}h homem</p>
                </div>
                <span className="text-xs text-neutral-500">{formatarData(atividade.data)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
