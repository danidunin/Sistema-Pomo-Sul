import { MaquinaForm } from "@/components/maquinas/maquina-form";
import { criarMaquina } from "@/actions/maquinas";
import { VoltarLink } from "@/components/nav/voltar-link";

export default function NovaMaquinaPage() {
  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/maquinas" label="Voltar às máquinas" />
      <h1 className="text-xl font-semibold text-neutral-900">Nova máquina</h1>
      <MaquinaForm action={criarMaquina} submitLabel="Criar máquina" />
    </div>
  );
}
