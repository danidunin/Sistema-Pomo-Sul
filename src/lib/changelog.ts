export type EntradaChangelog = {
  versao: string;
  data: string; // "YYYY-MM-DD"
  descricao: string;
};

/**
 * Atualizações do sistema, da mais recente para a mais antiga. A versão
 * atual é sempre a da primeira entrada.
 *
 * Uma entrada por DIA com atualização, nunca uma por commit/PR — veja a
 * seção "Changelog da tela inicial" no CLAUDE.md para o processo completo.
 * Resuma os temas principais do dia numa frase curta e suba uma casa
 * decimal da versão (1.1 → 1.2 → 1.3...).
 */
export const CHANGELOG: EntradaChangelog[] = [
  {
    versao: "1.1",
    data: "2026-11-09",
    descricao: "Estoque consolidado, comparativo de chuva entre propriedades e resumo de novidades na tela inicial",
  },
];

export const VERSAO_ATUAL = CHANGELOG[0].versao;

const UM_DIA_MS = 24 * 60 * 60 * 1000;

function paraEpochUTC(data: string): number {
  return new Date(`${data}T00:00:00Z`).getTime();
}

function hojeEpochUTC(): number {
  const agora = new Date();
  return Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate());
}

export function diasSemAtualizacao(): number {
  const ultima = CHANGELOG[0]?.data;
  if (!ultima) return 0;
  return Math.max(0, Math.round((hojeEpochUTC() - paraEpochUTC(ultima)) / UM_DIA_MS));
}

export function atualizacoesRecentes(): EntradaChangelog[] {
  const limite = hojeEpochUTC() - 7 * UM_DIA_MS;
  return CHANGELOG.filter((item) => paraEpochUTC(item.data) >= limite);
}
