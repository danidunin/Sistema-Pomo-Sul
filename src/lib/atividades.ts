import { db } from "@/lib/db";

/** Horas-homem por talhão (atividades + tratamentos): soma calculada em query, nunca armazenada em coluna redundante. */
export async function buscarHorasHomemTalhao(talhaoId: string): Promise<number> {
  const [atividades, operacoes] = await Promise.all([
    db.atividade.findMany({
      where: { talhaoId },
      select: { numeroPessoas: true, horasPorPessoa: true },
    }),
    db.operacaoAgricola.findMany({
      where: { talhaoId, numeroPessoas: { not: null } },
      select: { numeroPessoas: true, horasPorPessoa: true },
    }),
  ]);

  const totalAtividades = atividades.reduce((soma, a) => soma + a.numeroPessoas * Number(a.horasPorPessoa), 0);
  const totalOperacoes = operacoes.reduce((soma, o) => soma + o.numeroPessoas! * Number(o.horasPorPessoa), 0);

  return totalAtividades + totalOperacoes;
}
