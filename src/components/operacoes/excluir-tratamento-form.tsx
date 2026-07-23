"use client";

import { excluirOperacao } from "@/actions/operacoes";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export function ExcluirTratamentoForm({ operacaoId }: { operacaoId: string }) {
  return (
    <ConfirmarExclusao
      action={excluirOperacao.bind(null, operacaoId)}
      pergunta="Excluir? A quantidade dos produtos será devolvida ao estoque."
    />
  );
}
