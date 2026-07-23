"use client";

import { excluirContagemFrutos } from "@/actions/contagem-frutos";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export function ExcluirContagemForm({ contagemId }: { contagemId: string }) {
  return <ConfirmarExclusao action={excluirContagemFrutos.bind(null, contagemId)} />;
}
