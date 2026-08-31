import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { buscarDatasComTratamentoFitossanitario } from "@/lib/chuva";
import { criarChuvaRegistro } from "@/actions/chuva";
import { ChuvaForm } from "@/components/chuva/chuva-form";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaChuvaPage() {
  const propriedadeId = await exigirPropriedadeAtual();
  const datasComTratamento = await buscarDatasComTratamentoFitossanitario(propriedadeId);

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/chuva" label="Voltar ao Controle de Chuva" />
      <h1 className="text-xl font-semibold text-neutral-900">Nova leitura de chuva</h1>
      <ChuvaForm action={criarChuvaRegistro} datasComTratamento={datasComTratamento} />
    </div>
  );
}
