import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buscarHistoricoRevisoes } from "@/lib/maquinas";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { HistoricoRevisoes } from "@/components/maquinas/historico-revisoes";
import { AbasMaquina } from "@/components/maquinas/abas-maquina";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function RevisoesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const [maquina, historico] = await Promise.all([
    db.maquina.findUnique({ where: { id } }),
    buscarHistoricoRevisoes(id),
  ]);

  if (!maquina || maquina.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={`/maquinas/${maquina.id}`} label="Voltar à máquina" />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-neutral-900">{maquina.nome}</h1>
        <Link
          href={`/maquinas/${maquina.id}/revisoes/nova`}
          className="shrink-0 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Revisão
        </Link>
      </div>

      <AbasMaquina maquinaId={maquina.id} atual="revisoes" />

      <HistoricoRevisoes
        maquinaId={maquina.id}
        revisoes={historico.map((r) => ({
          id: r.id,
          data: r.data,
          horimetro: r.horimetro.toString(),
          servicoRealizado: r.servicoRealizado,
          observacoes: r.observacoes,
        }))}
      />
    </div>
  );
}
