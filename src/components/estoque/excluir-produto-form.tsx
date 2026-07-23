"use client";

import { excluirProduto } from "@/actions/estoque";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export function ExcluirProdutoForm({ produtoId }: { produtoId: string }) {
  return <ConfirmarExclusao action={excluirProduto.bind(null, produtoId)} />;
}
