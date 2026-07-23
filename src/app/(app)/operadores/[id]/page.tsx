import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { VoltarLink } from "@/components/nav/voltar-link";
import { ExcluirOperadorForm } from "./excluir-operador-form";

export default async function OperadorDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();
  const operador = await db.operador.findUnique({ where: { id } });

  if (!operador || operador.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/operadores" label="Voltar aos operadores" />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">
          {operador.nomeCompleto}
          {!operador.ativo && <span className="ml-2 text-sm font-normal text-neutral-500">(inativo)</span>}
        </h1>
        <div className="flex gap-2">
          <Link
            href={`/operadores/${operador.id}/editar`}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            Editar
          </Link>
          <ExcluirOperadorForm operadorId={operador.id} />
        </div>
      </div>

      {operador.fotoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={operador.fotoUrl}
          alt={operador.nomeCompleto}
          className="h-32 w-32 rounded-lg border border-neutral-200 object-cover"
        />
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {operador.apelido && <Linha label="Apelido" valor={operador.apelido} />}
        {operador.cpf && <Linha label="CPF" valor={operador.cpf} />}
        {operador.telefone && <Linha label="Telefone" valor={operador.telefone} />}
        {operador.funcao && <Linha label="Função" valor={operador.funcao} />}
        {operador.equipe && <Linha label="Equipe" valor={operador.equipe} />}
      </div>

      {operador.observacoes && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="mb-1 text-sm font-medium text-neutral-700">Observações</p>
          <p className="text-sm text-neutral-600">{operador.observacoes}</p>
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
