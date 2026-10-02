import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TIPO_OPERACAO_LABELS, unidadeDosagemEfetiva } from "@/lib/operacoes";
import { UNIDADE_DOSAGEM_LABELS } from "@/lib/concentracao";
import { formatarData } from "@/lib/format";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ExcluirTratamentoForm } from "@/components/operacoes/excluir-tratamento-form";
import { VoltarLink } from "@/components/nav/voltar-link";
import { Card } from "@/components/ui/card";

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
      mesmaAplicacaoDe: { select: { id: true, data: true } },
    },
  });

  if (!operacao || operacao.talhao.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={`/tratamentos?talhaoId=${operacao.talhaoId}`} label="Voltar aos tratamentos" />

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

      <Card padding="none" className="overflow-hidden">
        <Linha label="Data" valor={formatarData(operacao.data)} />
        <Linha label="Talhão" valor={operacao.talhao.nomeCodinome} />
        {/* Em adubação a área é a base do cálculo da quantidade total — mostrar ajuda a conferir. */}
        {operacao.tipo === "ADUBACAO" && operacao.talhao.areaHa && (
          <Linha label="Área do talhão" valor={`${operacao.talhao.areaHa.toString()} ha`} />
        )}
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
      </Card>

      {operacao.mesmaAplicacaoDe && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Continuação da aplicação de{" "}
          <Link href={`/tratamentos/${operacao.mesmaAplicacaoDe.id}`} className="font-medium underline">
            {formatarData(operacao.mesmaAplicacaoDe.data)}
          </Link>
          — no resumo do ciclo, os produtos em comum entre as duas contam como 1 aplicação só.
        </div>
      )}

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700">
          {operacao.tipo === "ADUBACAO" ? "Fertilizantes utilizados" : "Produtos utilizados"}
        </div>
        {operacao.produtos.map((item) => {
          const unidadeDosagem = unidadeDosagemEfetiva(operacao.tipo, item.produto.unidadeDosagem);
          return (
          <div
            key={item.id}
            className="flex justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0"
          >
            <div>
              <p className="text-sm text-neutral-900">{item.produto.nome}</p>
              {item.concentracao && unidadeDosagem && (
                <p className="text-xs text-neutral-500">
                  {item.concentracao.toString()} {UNIDADE_DOSAGEM_LABELS[unidadeDosagem]}
                </p>
              )}
            </div>
            <span className="text-sm text-neutral-500">
              {item.quantidade.toString()} {item.unidade}
            </span>
          </div>
          );
        })}
      </Card>

      {operacao.observacoes && (
        <Card>
          <p className="mb-1 text-sm font-medium text-neutral-700">Observações</p>
          <p className="text-sm text-neutral-600">{operacao.observacoes}</p>
        </Card>
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
