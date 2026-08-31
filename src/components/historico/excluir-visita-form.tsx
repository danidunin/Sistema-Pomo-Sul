"use client";

import { excluirVisitaCampo } from "@/actions/visitas";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export function ExcluirVisitaForm({ visitaId }: { visitaId: string }) {
  return (
    <ConfirmarExclusao
      action={excluirVisitaCampo.bind(null, visitaId)}
      pergunta="Confirma excluir esta visita?"
      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
    />
  );
}
