import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { buscarDatasComTratamentoFitossanitario } from "@/lib/chuva";
import { criarChuvaRegistro } from "@/actions/chuva";
import { ChuvaForm } from "@/components/chuva/chuva-form";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaChuvaPage() {
  const propriedadeId = await exigirPropriedadeAtual();
  const [datasComTratamento, propriedade] = await Promise.all([
    buscarDatasComTratamentoFitossanitario(propriedadeId),
    db.propriedade.findUnique({ where: { id: propriedadeId }, select: { nome: true } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/chuva" label="Voltar ao Controle de Chuva" />
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Nova leitura de chuva</h1>
        {propriedade && (
          <p className="text-sm text-neutral-500">
            Será registrada em <span className="font-medium text-neutral-700">{propriedade.nome}</span>
          </p>
        )}
      </div>
      <ChuvaForm action={criarChuvaRegistro} datasComTratamento={datasComTratamento} />
    </div>
  );
}
