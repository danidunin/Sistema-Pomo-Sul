import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ProdutoForm } from "@/components/estoque/produto-form";
import { ExcluirProdutoForm } from "@/components/estoque/excluir-produto-form";
import { atualizarProduto, alternarAtivoProduto } from "@/actions/estoque";
import { VoltarLink } from "@/components/nav/voltar-link";
import { Button } from "@/components/ui/button";

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();
  const produto = await db.produto.findUnique({ where: { id } });

  if (!produto || produto.propriedadeId !== propriedadeId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/estoque" label="Voltar ao estoque" />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">
          Editar produto
          {!produto.ativo && <span className="ml-2 text-sm font-normal text-neutral-500">(inativo)</span>}
        </h1>
        <div className="flex gap-2">
          <form action={alternarAtivoProduto.bind(null, produto.id, !produto.ativo)}>
            <Button type="submit" variant="secondary">
              {produto.ativo ? "Marcar como inativo" : "Reativar"}
            </Button>
          </form>
          <ExcluirProdutoForm produtoId={produto.id} />
        </div>
      </div>

      <ProdutoForm
        action={atualizarProduto.bind(null, id)}
        submitLabel="Salvar alterações"
        defaultValues={{
          nome: produto.nome,
          unidade: produto.unidade,
          unidadeDosagem: produto.unidadeDosagem ?? "",
          limiteAplicacoesCiclo: produto.limiteAplicacoesCiclo?.toString() ?? "",
          observacoes: produto.observacoes ?? "",
        }}
      />
    </div>
  );
}
