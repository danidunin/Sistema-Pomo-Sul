import { PontoForm } from "@/components/pragas/ponto-form";
import { criarPontoMonitoramento } from "@/actions/pragas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default function NovoPontoPage() {
  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/monitoramento-pragas/pontos" label="Voltar" />
      <h1 className="text-xl font-semibold text-neutral-900">Novo ponto de monitoramento</h1>
      <PontoForm action={criarPontoMonitoramento} submitLabel="Criar ponto" />
    </div>
  );
}
