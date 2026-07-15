"use client";

import { useState } from "react";
import { excluirContagemFrutos } from "@/actions/contagem-frutos";

export function ExcluirContagemForm({ contagemId }: { contagemId: string }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
      >
        Excluir
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-neutral-600">Confirma excluir?</span>
      <form action={excluirContagemFrutos.bind(null, contagemId)}>
        <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white active:bg-red-700">
          Sim, excluir
        </button>
      </form>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
      >
        Cancelar
      </button>
    </div>
  );
}
