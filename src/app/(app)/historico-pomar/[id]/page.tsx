import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { VisitaForm } from "@/components/historico/visita-form";
import { GaleriaFotosVisita } from "@/components/historico/galeria-fotos-visita";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function VisitaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const visita = await db.visitaCampo.findUnique({
    where: { id },
    include: { talhao: true, fotos: { orderBy: { createdAt: "desc" } } },
  });

  if (!visita || visita.talhao.propriedadeId !== propriedadeId) notFound();

  const talhoes = await db.talhao.findMany({
    where: { propriedadeId },
    orderBy: { nomeCodinome: "asc" },
    select: { id: true, nomeCodinome: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={`/historico-pomar?talhaoId=${visita.talhaoId}`} label="Voltar ao histórico" />

      <h1 className="text-xl font-semibold text-neutral-900">Visita de campo — {visita.talhao.nomeCodinome}</h1>

      <VisitaForm
        modo="editar"
        visitaId={visita.id}
        talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nomeCodinome }))}
        valoresIniciais={{
          talhaoId: visita.talhaoId,
          data: visita.data.toISOString().slice(0, 10),
          temperatura: visita.temperatura?.toString() ?? "",
          percentualEnfolhamento: visita.percentualEnfolhamento?.toString() ?? "",
          observacoes: visita.observacoes ?? "",
        }}
      />

      <GaleriaFotosVisita
        visitaId={visita.id}
        fotosIniciais={visita.fotos.map((f) => ({ id: f.id, url: f.url }))}
      />
    </div>
  );
}
