import { ProdutoForm } from "@/components/estoque/produto-form";
import { criarProduto } from "@/actions/estoque";
import { VoltarLink } from "@/components/nav/voltar-link";

export default function NovoProdutoPage() {
  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/estoque" label="Voltar ao estoque" />
      <h1 className="text-xl font-semibold text-neutral-900">Novo produto</h1>
      <ProdutoForm action={criarProduto} submitLabel="Criar produto" />
    </div>
  );
}
