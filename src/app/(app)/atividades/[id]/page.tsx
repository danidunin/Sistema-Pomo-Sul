import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatarData } from "@/lib/format";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { excluirAtividade } from "@/actions/atividades";
import { VoltarLink } from "@/components/nav/voltar-link";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export default async function AtividadeDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const atividade = await db.atividade.findUnique({
    where: { id },
    include: {
      tipoAtividade: true,
      talhao: true,
    },
  });

  if (!atividade || atividade.talhao.propriedadeId !== propriedadeId) notFound();

  const horasHomem = atividade.numeroPessoas * Number(atividade.horasPorPessoa);

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/atividades" label="Voltar às atividades" />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">{atividade.tipoAtividade.nome}</h1>
        <div className="flex items-center gap-3">
          <Link href={`/talhoes/${atividade.talhaoId}`} className="text-sm font-medium text-green-700">
            Ver talhão
          </Link>
          <Link
            href={`/atividades/${atividade.id}/editar`}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            Editar
          </Link>
          <ConfirmarExclusao action={excluirAtividade.bind(null, atividade.id)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <Linha label="Data" valor={formatarData(atividade.data)} />
        <Linha label="Talhão" valor={atividade.talhao.nomeCodinome} />
        <Linha
          label="Pessoas"
          valor={`${atividade.numeroPessoas} · ${atividade.horasPorPessoa.toString()}h por pessoa`}
        />
        <Linha label="Horas-homem" valor={`${horasHomem}h`} />
        {atividade.horasMaquina !== null && (
          <Linha label="Horas de máquina" valor={`${atividade.horasMaquina.toString()}h`} />
        )}
      </div>

      {atividade.observacoes && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="mb-1 text-sm font-medium text-neutral-700">Observações</p>
          <p className="text-sm text-neutral-600">{atividade.observacoes}</p>
        </div>
      )}
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
