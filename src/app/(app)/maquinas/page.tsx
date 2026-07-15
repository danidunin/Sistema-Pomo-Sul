import Link from "next/link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ExportarBotoes } from "@/components/relatorios/exportar-botoes";

export default async function MaquinasPage() {
  const propriedadeId = await exigirPropriedadeAtual();
  const maquinas = await db.maquina.findMany({
    where: { propriedadeId },
    orderBy: { nome: "asc" },
    include: { fotos: { take: 1, orderBy: { createdAt: "desc" }, select: { url: true } } },
  });

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

      <ExportarBotoes recurso="maquinas" />

      {maquinas.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma máquina cadastrada ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {maquinas.map((maquina) => (
            <Link
              key={maquina.id}
              href={`/maquinas/${maquina.id}`}
              className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
            >
              {maquina.fotoUrl ?? maquina.fotos[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={maquina.fotoUrl ?? maquina.fotos[0].url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg border border-neutral-200 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-xl">
                  🚜
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900">{maquina.nome}</p>
                <p className="text-xs text-neutral-500">
                  {[maquina.marca, maquina.modelo].filter(Boolean).join(" · ") || "Sem detalhes cadastrados"}
                </p>
              </div>
              {maquina.horimetroAtual && (
                <span className="shrink-0 text-xs text-neutral-500">{maquina.horimetroAtual.toString()}h</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
