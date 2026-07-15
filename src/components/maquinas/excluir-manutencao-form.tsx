"use client";

import { useState } from "react";
import { excluirManutencao } from "@/actions/maquinas";

export function ExcluirManutencaoForm({ maquinaId, manutencaoId }: { maquinaId: string; manutencaoId: string }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="text-xs font-medium text-red-600">
        Excluir
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-neutral-600">Confirma?</span>
      <form action={excluirManutencao.bind(null, maquinaId, manutencaoId)}>
        <button type="submit" className="text-xs font-semibold text-red-600">
          Sim, excluir
        </button>
      </form>
      <button type="button" onClick={() => setConfirmando(false)} className="text-xs text-neutral-500">
        Cancelar
      </button>
    </div>
  );
}
