import { TalhaoForm } from "@/components/talhoes/talhao-form";
import { criarTalhao } from "@/actions/talhoes";

export default function NovoTalhaoPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Novo talhão</h1>
      <TalhaoForm action={criarTalhao} submitLabel="Criar talhão" />
    </div>
  );
}
