import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { buscarDatasComTratamentoFitossanitario } from "@/lib/chuva";
import { atualizarChuvaRegistro, excluirChuvaRegistro } from "@/actions/chuva";
import { ChuvaForm } from "@/components/chuva/chuva-form";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarChuvaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const [leitura, datasComTratamento] = await Promise.all([
    db.chuvaRegistro.findUnique({ where: { id } }),
    buscarDatasComTratamentoFitossanitario(propriedadeId),
  ]);

  if (!leitura || leitura.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/chuva" label="Voltar ao Controle de Chuva" />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Editar leitura</h1>
        <ConfirmarExclusao action={excluirChuvaRegistro.bind(null, leitura.id)} />
      </div>
      <ChuvaForm
        action={atualizarChuvaRegistro.bind(null, leitura.id)}
        submitLabel="Salvar alterações"
        datasComTratamento={datasComTratamento}
        defaultValues={{
          data: leitura.data.toISOString().slice(0, 10),
          quantidadeMm: leitura.quantidadeMm.toString(),
          relacaoTratamentoDia: leitura.relacaoTratamentoDia ?? "",
          observacoes: leitura.observacoes ?? "",
        }}
      />
    </div>
  );
}
