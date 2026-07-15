import { TalhaoForm } from "@/components/talhoes/talhao-form";
import { criarTalhao } from "@/actions/talhoes";
import { VoltarLink } from "@/components/nav/voltar-link";

export default function NovoTalhaoPage() {
  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/talhoes" label="Voltar aos talhões" />
      <h1 className="text-xl font-semibold text-neutral-900">Novo talhão</h1>
      <TalhaoForm action={criarTalhao} submitLabel="Criar talhão" />
    </div>
  );
}
