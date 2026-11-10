import { ProdutoForm } from "@/components/estoque/produto-form";
import { criarProduto } from "@/actions/estoque";
import { VoltarLink } from "@/components/nav/voltar-link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { agruparProdutosExistentes } from "@/lib/produto-nome";

export default async function NovoProdutoPage() {
  const propriedadeId = await exigirPropriedadeAtual();

  // Produtos de TODAS as fazendas: é o que permite avisar o gerente da Lapinha
  // que a Pomo já cadastrou o mesmo produto, antes de criar um segundo cadastro.
  const produtos = await db.produto.findMany({
    where: { ativo: true },
    select: { nome: true, unidade: true, propriedadeId: true, propriedade: { select: { nome: true } } },
    orderBy: { nome: "asc" },
  });
  const produtosExistentes = agruparProdutosExistentes(
    produtos.map((p) => ({
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
      <h1 className="text-xl font-semibold text-neutral-900">Novo produto</h1>
      <ProdutoForm action={criarProduto} submitLabel="Criar produto" produtosExistentes={produtosExistentes} />
    </div>
  );
}
