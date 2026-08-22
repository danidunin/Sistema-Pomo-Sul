import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ArmadilhaForm } from "@/components/pragas/armadilha-form";
import { criarArmadilha } from "@/actions/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaArmadilhaPage({
  searchParams,
}: {
  searchParams: Promise<{ pontoId?: string }>;
}) {
  const { pontoId } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const [pontos, talhoes] = await Promise.all([
    db.pontoMonitoramento.findMany({
      where: { propriedadeId },
      orderBy: [{ safra: "desc" }, { nome: "asc" }],
      select: { id: true, nome: true, safra: true },
    }),
    db.talhao.findMany({ where: { propriedadeId }, orderBy: { nomeCodinome: "asc" }, select: { id: true, nomeCodinome: true } }),
  ]);

  if (pontos.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <VoltarLink href="/monitoramento-pragas/armadilhas" label="Voltar" />
        <h1 className="text-xl font-semibold text-neutral-900">Nova armadilha</h1>
        <p className="text-sm text-neutral-500">
          Cadastre um ponto de monitoramento antes de registrar uma armadilha.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/monitoramento-pragas/armadilhas" label="Voltar" />
      <h1 className="text-xl font-semibold text-neutral-900">Nova armadilha</h1>
      <ArmadilhaForm
        action={criarArmadilha}
        pontos={pontos.map((p) => ({ id: p.id, nome: p.nome, safra: p.safra }))}
        talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nomeCodinome }))}
        defaultValues={pontoId ? { pontoMonitoramentoId: pontoId } : undefined}
        submitLabel="Criar armadilha"
      />
    </div>
  );
}
