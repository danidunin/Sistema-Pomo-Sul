import { NovoProdutoForm } from "@/components/estoque/novo-produto-form";

export default function NovoProdutoPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Novo produto</h1>
      <NovoProdutoForm />
    </div>
  );
}
