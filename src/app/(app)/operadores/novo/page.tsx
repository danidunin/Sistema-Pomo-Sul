import { OperadorForm } from "@/components/operadores/operador-form";
import { criarOperador } from "@/actions/operadores";
import { VoltarLink } from "@/components/nav/voltar-link";

export default function NovoOperadorPage() {
  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/operadores" label="Voltar aos operadores" />
      <h1 className="text-xl font-semibold text-neutral-900">Novo operador</h1>
      <OperadorForm action={criarOperador} submitLabel="Criar operador" />
    </div>
  );
}
