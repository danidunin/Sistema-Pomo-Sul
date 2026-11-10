import {
  VERSAO_ATUAL,
  atualizacoesRecentes,
  dataUltimaAtualizacaoFormatada,
  diasSemAtualizacao,
} from "@/lib/changelog";

/**
 * Faixa discreta no topo da Home: versão do sistema, quando foi a última
 * atualização, e um resumo bem curto do que mudou nos últimos 7 dias.
 */
export function NovidadesBar() {
  const dias = diasSemAtualizacao();
  const recentes = atualizacoesRecentes();
  const data = dataUltimaAtualizacaoFormatada();

  return (
    <div className="flex flex-col gap-0.5 pb-2 text-[11px] text-neutral-400">
      <div className="flex items-center gap-x-2">
        <span className="font-medium text-neutral-500">v{VERSAO_ATUAL}</span>
        <span aria-hidden>·</span>
        <span>
          {dias === 0 ? `Atualizado hoje (${data})` : `Última atualização em ${data} (${dias} dia${dias === 1 ? "" : "s"})`}
        </span>
      </div>
      {recentes.map((item) => (
        <p key={item.data} className="truncate">
          {item.descricao}
        </p>
      ))}
    </div>
  );
}
