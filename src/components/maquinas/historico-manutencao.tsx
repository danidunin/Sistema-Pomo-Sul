import Link from "next/link";
import { formatarData } from "@/lib/format";
import { TIPO_CONSERTO_LABELS } from "@/lib/tipo-conserto";
import { ExcluirManutencaoForm } from "@/components/maquinas/excluir-manutencao-form";
import type { TipoConserto } from "@/generated/prisma/enums";

type Manutencao = {
  id: string;
  data: Date;
  servicoRealizado: string;
  tiposConserto: TipoConserto[];
  pecasUtilizadas: string | null;
  valor: string | null;
  mecanico: string | null;
  observacoes: string | null;
  documentos: { id: string; nome: string; url: string }[];
};

export function HistoricoManutencao({ maquinaId, manutencoes }: { maquinaId: string; manutencoes: Manutencao[] }) {
  if (manutencoes.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhuma manutenção registrada ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {manutencoes.map((m) => (
        <div key={m.id} className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-neutral-900">{m.servicoRealizado}</p>
            <span className="shrink-0 text-xs text-neutral-500">{formatarData(m.data)}</span>
          </div>

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
            {m.valor != null && <span>R$ {m.valor}</span>}
            {m.mecanico && <span>{m.mecanico}</span>}
          </div>

          {m.tiposConserto.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {m.tiposConserto.map((tipo) => (
                <span
                  key={tipo}
                  className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600"
                >
                  {TIPO_CONSERTO_LABELS[tipo]}
                </span>
              ))}
            </div>
          )}

          {m.pecasUtilizadas && (
            <p className="mt-2 text-xs text-neutral-500">Peças: {m.pecasUtilizadas}</p>
          )}

          {m.observacoes && <p className="mt-2 text-sm text-neutral-600">{m.observacoes}</p>}

          {m.documentos.length > 0 && (
            <div className="mt-3 flex flex-col gap-1">
              {m.documentos.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-green-700"
                >
                  <span>📄</span>
                  <span className="truncate underline">{doc.nome}</span>
                </a>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-3 border-t border-neutral-100 pt-3">
            <Link
              href={`/maquinas/${maquinaId}/manutencoes/${m.id}/editar`}
              className="rounded-md px-2 py-1.5 text-sm font-medium text-green-700"
            >
              Editar
            </Link>
            <ExcluirManutencaoForm maquinaId={maquinaId} manutencaoId={m.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
