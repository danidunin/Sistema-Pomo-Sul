import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { OperadorForm } from "@/components/operadores/operador-form";
import { atualizarOperador } from "@/actions/operadores";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarOperadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();
  const operador = await db.operador.findUnique({ where: { id } });

  if (!operador || operador.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={`/operadores/${operador.id}`} label="Voltar ao operador" />
      <h1 className="text-xl font-semibold text-neutral-900">Editar operador</h1>
      <OperadorForm
        action={atualizarOperador.bind(null, id)}
        submitLabel="Salvar alterações"
        defaultValues={{
          nomeCompleto: operador.nomeCompleto,
          apelido: operador.apelido ?? "",
          cpf: operador.cpf ?? "",
          telefone: operador.telefone ?? "",
          funcao: operador.funcao ?? "",
          equipe: operador.equipe ?? "",
          ativo: operador.ativo,
          observacoes: operador.observacoes ?? "",
          fotoUrl: operador.fotoUrl ?? "",
        }}
      />
    </div>
  );
}
