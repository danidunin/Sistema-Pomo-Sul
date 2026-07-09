import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatarData } from "@/lib/format";

export default async function AtividadeDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const atividade = await db.atividade.findUnique({
    where: { id },
    include: {
      tipoAtividade: true,
      talhao: true,
      funcionarios: { include: { usuario: true } },
    },
  });

  if (!atividade) notFound();

  const horasHomem = atividade.funcionarios.reduce((soma, f) => soma + Number(f.horasTrabalhadas), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">{atividade.tipoAtividade.nome}</h1>
        <Link href={`/talhoes/${atividade.talhaoId}`} className="text-sm font-medium text-green-700">
          Ver talhão
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <Linha label="Data" valor={formatarData(atividade.data)} />
        <Linha label="Talhão" valor={atividade.talhao.nomeCodinome} />
        <Linha label="Horas-homem" valor={`${horasHomem}h`} />
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700">
          Funcionários
        </div>
        {atividade.funcionarios.map((f) => (
          <div
            key={f.id}
            className="flex justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0"
          >
            <span className="text-sm text-neutral-900">{f.usuario.nome}</span>
            <span className="text-sm text-neutral-500">{f.horasTrabalhadas.toString()}h</span>
          </div>
        ))}
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
