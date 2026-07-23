import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { criarAtividade } from "@/actions/atividades";
import { AtividadeForm } from "@/components/atividades/atividade-form";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaAtividadePage() {
  const propriedadeId = await exigirPropriedadeAtual();
  const [tiposAtividade, talhoes] = await Promise.all([
    db.tipoAtividade.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    db.talhao.findMany({
      where: { propriedadeId },
      orderBy: { nomeCodinome: "asc" },
      select: { id: true, nomeCodinome: true },
    }),
  ]);

  if (talhoes.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <VoltarLink href="/atividades" label="Voltar às atividades" />
        <h1 className="text-xl font-semibold text-neutral-900">Nova atividade</h1>
        <p className="text-sm text-neutral-500">Cadastre um talhão antes de registrar uma atividade.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/atividades" label="Voltar às atividades" />
      <h1 className="text-xl font-semibold text-neutral-900">Nova atividade</h1>
      <AtividadeForm
        action={criarAtividade}
        tiposAtividade={tiposAtividade}
        talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nomeCodinome }))}
      />
    </div>
  );
}
