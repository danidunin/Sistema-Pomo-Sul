"use client";

import { excluirOperacao } from "@/actions/operacoes";

export function ExcluirTratamentoForm({ operacaoId }: { operacaoId: string }) {
  return (
    <form
      action={excluirOperacao.bind(null, operacaoId)}
      onSubmit={(e) => {
        if (!confirm("Excluir este tratamento? A quantidade dos produtos usados será devolvida ao estoque.")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600">
        Excluir
      </button>
    </form>
  );
}
