"use client";

import { excluirRevisao } from "@/actions/maquinas";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export function ExcluirRevisaoForm({ maquinaId, revisaoId }: { maquinaId: string; revisaoId: string }) {
  return (
    <ConfirmarExclusao
      action={excluirRevisao.bind(null, maquinaId, revisaoId)}
      pergunta="Confirma?"
      className="rounded-md px-2 py-1.5 text-sm font-medium text-red-600"
    />
  );
}
