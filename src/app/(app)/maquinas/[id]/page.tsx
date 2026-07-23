import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buscarHistoricoManutencao } from "@/lib/maquinas";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { HistoricoManutencao } from "@/components/maquinas/historico-manutencao";
import { FotoPrincipal } from "@/components/maquinas/foto-principal";
import { AbasMaquina } from "@/components/maquinas/abas-maquina";
import { ExportarBotoes } from "@/components/relatorios/exportar-botoes";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function MaquinaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const [maquina, historico] = await Promise.all([
    db.maquina.findUnique({ where: { id } }),
    buscarHistoricoManutencao(id),
  ]);

  if (!maquina || maquina.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/maquinas" label="Voltar às máquinas" />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <FotoPrincipal maquinaId={maquina.id} fotoUrl={maquina.fotoUrl} nome={maquina.nome} />
          <h1 className="text-xl font-semibold text-neutral-900">{maquina.nome}</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/maquinas/${maquina.id}/editar`}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            Editar
          </Link>
          <Link
            href={`/maquinas/${maquina.id}/manutencoes/nova`}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
          >
            + Manutenção
          </Link>
        </div>
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

      <AbasMaquina maquinaId={maquina.id} atual="manutencoes" />

      <ExportarBotoes recurso="manutencoes" filtros={`maquinaId=${maquina.id}`} />

      <div>
        <HistoricoManutencao
          maquinaId={maquina.id}
          manutencoes={historico.map((m) => ({
            id: m.id,
            data: m.data,
            servicoRealizado: m.servicoRealizado,
            tiposConserto: m.tiposConserto,
            pecasUtilizadas: m.pecasUtilizadas,
            valor: m.valor?.toString() ?? null,
            mecanico: m.mecanico,
            observacoes: m.observacoes,
            documentos: m.documentos.map((d) => ({ id: d.id, nome: d.nome, url: d.url })),
          }))}
        />
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
