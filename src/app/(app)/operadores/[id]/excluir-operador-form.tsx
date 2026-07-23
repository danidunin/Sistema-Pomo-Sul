"use client";

import { excluirOperador } from "@/actions/operadores";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export function ExcluirOperadorForm({ operadorId }: { operadorId: string }) {
  return <ConfirmarExclusao action={excluirOperador.bind(null, operadorId)} />;
}
