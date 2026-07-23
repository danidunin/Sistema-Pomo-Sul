"use client";

import { excluirManutencao } from "@/actions/maquinas";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export function ExcluirManutencaoForm({ maquinaId, manutencaoId }: { maquinaId: string; manutencaoId: string }) {
  return (
    <ConfirmarExclusao
      action={excluirManutencao.bind(null, maquinaId, manutencaoId)}
      pergunta="Confirma?"
      className="rounded-md px-2 py-1.5 text-sm font-medium text-red-600"
    />
  );
}
