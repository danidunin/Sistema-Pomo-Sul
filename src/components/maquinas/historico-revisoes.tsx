import Link from "next/link";
import { formatarData } from "@/lib/format";
import { ExcluirRevisaoForm } from "@/components/maquinas/excluir-revisao-form";

type Revisao = {
  id: string;
  data: Date;
  horimetro: string;
  servicoRealizado: string;
  observacoes: string | null;
};

export function HistoricoRevisoes({ maquinaId, revisoes }: { maquinaId: string; revisoes: Revisao[] }) {
  if (revisoes.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhuma revisão registrada ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {revisoes.map((r) => (
        <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-neutral-900">{r.servicoRealizado}</p>
            <span className="shrink-0 text-xs text-neutral-500">{formatarData(r.data)}</span>
          </div>

          <p className="mt-1 text-xs text-neutral-500">Horímetro: {r.horimetro}h</p>

          {r.observacoes && <p className="mt-2 text-sm text-neutral-600">{r.observacoes}</p>}

          <div className="mt-3 flex items-center gap-3 border-t border-neutral-100 pt-3">
            <Link href={`/maquinas/${maquinaId}/revisoes/${r.id}/editar`} className="text-xs font-medium text-green-700">
              Editar
            </Link>
            <ExcluirRevisaoForm maquinaId={maquinaId} revisaoId={r.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
