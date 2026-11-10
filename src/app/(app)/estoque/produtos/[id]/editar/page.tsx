import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ProdutoForm } from "@/components/estoque/produto-form";
import { ExcluirProdutoForm } from "@/components/estoque/excluir-produto-form";
import { atualizarProduto, alternarAtivoProduto } from "@/actions/estoque";
import { VoltarLink } from "@/components/nav/voltar-link";
import { Button } from "@/components/ui/button";
import { agruparProdutosExistentes } from "@/lib/produto-nome";

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();
  const produto = await db.produto.findUnique({ where: { id } });

  if (!produto || produto.propriedadeId !== propriedadeId) notFound();

  // Outros produtos de TODAS as fazendas (menos este): avisa se o nome for
  // trocado para algo parecido com um produto que já existe.
  const outrosProdutos = await db.produto.findMany({
    where: { ativo: true, id: { not: produto.id } },
    select: { nome: true, unidade: true, propriedadeId: true, propriedade: { select: { nome: true } } },
    orderBy: { nome: "asc" },
  });
  const produtosExistentes = agruparProdutosExistentes(
    outrosProdutos.map((p) => ({
      nome: p.nome,
      unidade: p.unidade,
      propriedadeId: p.propriedadeId,
      propriedadeNome: p.propriedade.nome,
    })),
    propriedadeId,
  );

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
        produtosExistentes={produtosExistentes}
        editando
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
