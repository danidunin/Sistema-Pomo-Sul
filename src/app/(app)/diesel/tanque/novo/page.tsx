import { TanqueForm } from "@/components/diesel/tanque-form";
import { criarTanqueDiesel } from "@/actions/diesel";
import { VoltarLink } from "@/components/nav/voltar-link";

export default function NovoTanquePage() {
  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/diesel" label="Voltar ao Controle de Diesel" />
      <h1 className="text-xl font-semibold text-neutral-900">Cadastrar tanque</h1>
      <TanqueForm action={criarTanqueDiesel} submitLabel="Criar tanque" exibirEstoqueAtual />
    </div>
  );
}
