import { db } from "@/lib/db";

/** Horas-homem por talhão: soma calculada em query, nunca armazenada em coluna redundante. */
export async function buscarHorasHomemTalhao(talhaoId: string): Promise<number> {
  const funcionarios = await db.atividadeFuncionario.findMany({
    where: { atividade: { talhaoId } },
    select: { horasTrabalhadas: true },
  });

  return funcionarios.reduce((soma, f) => soma + Number(f.horasTrabalhadas), 0);
}
