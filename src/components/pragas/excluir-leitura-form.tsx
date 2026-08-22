"use client";

import { excluirLeituraArmadilha } from "@/actions/pragas";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export function ExcluirLeituraForm({ leituraId }: { leituraId: string }) {
  return <ConfirmarExclusao action={excluirLeituraArmadilha.bind(null, leituraId)} />;
}
