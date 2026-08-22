"use client";

import { excluirPontoMonitoramento } from "@/actions/pragas";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

export function ExcluirPontoForm({ pontoId }: { pontoId: string }) {
  return (
    <ConfirmarExclusao
      action={excluirPontoMonitoramento.bind(null, pontoId)}
      pergunta="Confirma excluir este ponto? Se já houver leitura registrada, ele será apenas desativado."
    />
  );
}
