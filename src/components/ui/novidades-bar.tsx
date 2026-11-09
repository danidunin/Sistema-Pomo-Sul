import { VERSAO_ATUAL, atualizacoesRecentes, diasSemAtualizacao } from "@/lib/changelog";

/**
 * Faixa discreta no topo da Home: versão do sistema, há quantos dias foi a
 * última atualização, e um resumo bem curto do que mudou nos últimos 7 dias.
 */
export function NovidadesBar() {
  const dias = diasSemAtualizacao();
  const recentes = atualizacoesRecentes();

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pb-2 text-[11px] text-neutral-400">
      <span className="font-medium text-neutral-500">v{VERSAO_ATUAL}</span>
      <span aria-hidden>·</span>
      <span>
        {dias === 0 ? "Atualizado hoje" : `${dias} dia${dias === 1 ? "" : "s"} sem atualização`}
      </span>
      {recentes.length > 0 && (
        <>
          <span aria-hidden>·</span>
          <span className="truncate">{recentes.map((item) => item.descricao).join(" · ")}</span>
        </>
      )}
    </div>
  );
}
