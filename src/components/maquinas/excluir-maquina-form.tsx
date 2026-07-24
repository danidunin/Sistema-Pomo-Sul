"use client";

import { excluirMaquina } from "@/actions/maquinas";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export function ExcluirMaquinaForm({ maquinaId }: { maquinaId: string }) {
  return (
    <ConfirmarExclusao
      action={excluirMaquina.bind(null, maquinaId)}
      pergunta="Confirma excluir esta máquina?"
      className="flex-1 rounded-lg border border-red-200 px-4 py-2 text-center text-sm font-medium text-red-600 sm:flex-none"
    />
  );
}
