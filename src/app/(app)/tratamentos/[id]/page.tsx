import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TIPO_OPERACAO_LABELS } from "@/lib/operacoes";
import { UNIDADE_DOSAGEM_LABELS } from "@/lib/concentracao";
import { formatarData } from "@/lib/format";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ExcluirTratamentoForm } from "@/components/operacoes/excluir-tratamento-form";

export default async function OperacaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const operacao = await db.operacaoAgricola.findUnique({
    where: { id },
    include: {
      talhao: true,
      responsavel: true,
      operador: true,
      maquina: true,
      produtos: { include: { produto: true } },
    },
  });

  if (!operacao || operacao.talhao.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/tratamentos?talhaoId=${operacao.talhaoId}`} className="text-sm font-medium text-green-700">
        ← Voltar aos tratamentos
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">
          {TIPO_OPERACAO_LABELS[operacao.tipo]}
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/talhoes/${operacao.talhaoId}`}
            className="text-sm font-medium text-green-700"
          >
            Ver talhão
          </Link>
          <Link
            href={`/tratamentos/${operacao.id}/editar`}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            Editar
          </Link>
          <ExcluirTratamentoForm operacaoId={operacao.id} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <Linha label="Data" valor={formatarData(operacao.data)} />
        <Linha label="Talhão" valor={operacao.talhao.nomeCodinome} />
        <Linha label="Responsável" valor={operacao.responsavel.nome} />
        {operacao.operador && <Linha label="Operador" valor={operacao.operador.nomeCompleto} />}
        {operacao.maquina && <Linha label="Máquina" valor={operacao.maquina.nome} />}
        {operacao.volumeCalda && <Linha label="Volume de calda" valor={`${operacao.volumeCalda.toString()} L`} />}
        {operacao.numeroPessoas && operacao.horasPorPessoa && (
          <Linha
            label="Pessoas"
            valor={`${operacao.numeroPessoas} · ${operacao.horasPorPessoa.toString()}h por pessoa`}
          />
        )}
        {operacao.numeroPessoas && operacao.horasPorPessoa && (
          <Linha
            label="Horas-homem"
            valor={`${operacao.numeroPessoas * Number(operacao.horasPorPessoa)}h`}
          />
        )}
        {operacao.horasMaquina && <Linha label="Horas de máquina" valor={`${operacao.horasMaquina.toString()}h`} />}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700">
          Produtos utilizados
        </div>
        {operacao.produtos.map((item) => (
          <div
            key={item.id}
            className="flex justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0"
          >
            <div>
              <p className="text-sm text-neutral-900">{item.produto.nome}</p>
              {item.concentracao && item.produto.unidadeDosagem && (
                <p className="text-xs text-neutral-500">
                  {item.concentracao.toString()} {UNIDADE_DOSAGEM_LABELS[item.produto.unidadeDosagem]}
                </p>
              )}
            </div>
            <span className="text-sm text-neutral-500">
              {item.quantidade.toString()} {item.unidade}
            </span>
          </div>
        ))}
      </div>

      {operacao.observacoes && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="mb-1 text-sm font-medium text-neutral-700">Observações</p>
          <p className="text-sm text-neutral-600">{operacao.observacoes}</p>
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
