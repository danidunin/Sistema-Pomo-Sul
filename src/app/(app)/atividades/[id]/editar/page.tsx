import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { atualizarAtividade } from "@/actions/atividades";
import { AtividadeForm } from "@/components/atividades/atividade-form";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarAtividadePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const atividade = await db.atividade.findUnique({
    where: { id },
    include: { talhao: true },
  });
  if (!atividade || atividade.talhao.propriedadeId !== propriedadeId) notFound();

  const [tiposAtividade, talhoes] = await Promise.all([
    db.tipoAtividade.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    db.talhao.findMany({
      where: { propriedadeId },
      orderBy: { nomeCodinome: "asc" },
      select: { id: true, nomeCodinome: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={`/atividades/${atividade.id}`} label="Voltar à atividade" />
      <h1 className="text-xl font-semibold text-neutral-900">Editar atividade</h1>
      <AtividadeForm
        action={atualizarAtividade.bind(null, atividade.id)}
        submitLabel="Salvar alterações"
        tiposAtividade={tiposAtividade}
        talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nomeCodinome }))}
        defaultValues={{
          tipoAtividadeId: atividade.tipoAtividadeId,
          talhaoId: atividade.talhaoId,
          data: atividade.data.toISOString().slice(0, 10),
          numeroPessoas: String(atividade.numeroPessoas),
          horasPorPessoa: atividade.horasPorPessoa.toString(),
          horasMaquina: atividade.horasMaquina?.toString() ?? "",
          observacoes: atividade.observacoes ?? "",
        }}
      />
    </div>
  );
}
