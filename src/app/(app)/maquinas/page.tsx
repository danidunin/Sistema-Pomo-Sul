import Link from "next/link";
import { db } from "@/lib/db";

export default async function MaquinasPage() {
  const maquinas = await db.maquina.findMany({ orderBy: { nome: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Máquinas e Manutenção</h1>
        <Link
          href="/maquinas/novo"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova máquina
        </Link>
      </div>

      {maquinas.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma máquina cadastrada ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {maquinas.map((maquina) => (
            <Link
              key={maquina.id}
              href={`/maquinas/${maquina.id}`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{maquina.nome}</p>
                <p className="text-xs text-neutral-500">
                  {[maquina.marca, maquina.modelo].filter(Boolean).join(" · ") || "Sem detalhes cadastrados"}
                </p>
              </div>
              {maquina.horimetroAtual && (
                <span className="text-xs text-neutral-500">{maquina.horimetroAtual.toString()}h</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
