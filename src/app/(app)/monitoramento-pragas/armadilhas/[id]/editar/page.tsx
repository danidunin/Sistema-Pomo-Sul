import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ArmadilhaForm } from "@/components/pragas/armadilha-form";
import { ExcluirArmadilhaForm } from "@/components/pragas/excluir-armadilha-form";
import { atualizarArmadilha } from "@/actions/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarArmadilhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const armadilha = await db.armadilha.findUnique({ where: { id }, include: { pontoMonitoramento: true } });
  if (!armadilha || armadilha.pontoMonitoramento.propriedadeId !== propriedadeId) notFound();

  const [pontos, talhoes] = await Promise.all([
    db.pontoMonitoramento.findMany({
      where: { propriedadeId },
      orderBy: [{ safra: "desc" }, { nome: "asc" }],
      select: { id: true, nome: true, safra: true },
    }),
    db.talhao.findMany({ where: { propriedadeId }, orderBy: { nomeCodinome: "asc" }, select: { id: true, nomeCodinome: true } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <VoltarLink href="/monitoramento-pragas/armadilhas" label="Voltar" />
        <ExcluirArmadilhaForm armadilhaId={armadilha.id} />
      </div>

      <h1 className="text-xl font-semibold text-neutral-900">Editar armadilha — {armadilha.rotulo}</h1>

      <ArmadilhaForm
        action={atualizarArmadilha.bind(null, armadilha.id)}
        pontos={pontos.map((p) => ({ id: p.id, nome: p.nome, safra: p.safra }))}
        talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nomeCodinome }))}
        defaultValues={{
          pontoMonitoramentoId: armadilha.pontoMonitoramentoId,
          talhaoId: armadilha.talhaoId,
          rotulo: armadilha.rotulo,
        }}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
