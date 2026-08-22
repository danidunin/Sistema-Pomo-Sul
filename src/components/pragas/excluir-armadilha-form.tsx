"use client";

import { excluirArmadilha } from "@/actions/pragas";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export function ExcluirArmadilhaForm({ armadilhaId }: { armadilhaId: string }) {
  return (
    <ConfirmarExclusao
      action={excluirArmadilha.bind(null, armadilhaId)}
      pergunta="Confirma excluir esta armadilha? Se já houver leitura registrada, ela será apenas desativada."
    />
  );
}
