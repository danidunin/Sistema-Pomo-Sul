import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buscarHistoricoManutencao } from "@/lib/maquinas";
import { Timeline } from "@/components/historico/timeline";

export default async function MaquinaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [maquina, historico] = await Promise.all([
    db.maquina.findUnique({ where: { id } }),
    buscarHistoricoManutencao(id),
  ]);

  if (!maquina) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">{maquina.nome}</h1>
        <Link
          href={`/maquinas/${maquina.id}/manutencoes/nova`}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Manutenção
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {maquina.marca && <Linha label="Marca" valor={maquina.marca} />}
        {maquina.modelo && <Linha label="Modelo" valor={maquina.modelo} />}
        {maquina.ano && <Linha label="Ano" valor={String(maquina.ano)} />}
        {maquina.horimetroAtual && <Linha label="Horímetro atual" valor={`${maquina.horimetroAtual.toString()}h`} />}
      </div>

      {maquina.observacoes && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="mb-1 text-sm font-medium text-neutral-700">Observações</p>
          <p className="text-sm text-neutral-600">{maquina.observacoes}</p>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-700">Histórico de manutenção</h2>
        <Timeline itens={historico} />
      </div>
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-900">{valor}</span>
    </div>
  );
}
