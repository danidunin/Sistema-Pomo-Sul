export type EntradaChangelog = {
  versao: string;
  data: string; // "YYYY-MM-DD"
  // Uma frase = uma linha no card. Use array quando o dia tiver mais de um tema.
  descricao: string | string[];
};

/**
 * Atualizações do sistema, da mais recente para a mais antiga. A versão
 * atual é sempre a da primeira entrada.
 *
 * Uma entrada por DIA com atualização, nunca uma por commit/PR — veja a
 * seção "Changelog da tela inicial" no CLAUDE.md para o processo completo.
 * Cada tema do dia é uma frase curta (string ou item do array `descricao`),
 * e a versão sobe uma casa decimal por dia com atualização (1.1 → 1.2 → 1.3...).
 */
export const CHANGELOG: EntradaChangelog[] = [
  {
    versao: "1.2",
    data: "2026-11-11",
    descricao: "Abas de tratamentos mostram a chuva acumulada desde a última aplicação de cada quadra",
  },
  {
    versao: "1.1",
    data: "2026-11-09",
    descricao: [
      "Estoque consolidado entre propriedades",
      "Nomes de produtos padronizados, com aviso de duplicidade",
      "Comparativo de chuva entre propriedades",
      "Resumo de novidades na tela inicial",
    ],
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

export function dataUltimaAtualizacaoFormatada(): string {
  const ultima = CHANGELOG[0]?.data;
  if (!ultima) return "";
  return new Date(`${ultima}T00:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

export function atualizacoesRecentes(): EntradaChangelog[] {
  const limite = hojeEpochUTC() - 7 * UM_DIA_MS;
  return CHANGELOG.filter((item) => paraEpochUTC(item.data) >= limite);
}
