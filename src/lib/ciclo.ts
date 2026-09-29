export type Ciclo = {
  anoInicio: number;
  label: string;
  inicio: Date;
  fim: Date;
};

/**
 * O ciclo agrícola vai de 1º de maio a 30 de abril do ano seguinte. Datas de campos
 * "somente data" (<input type="date">) são meia-noite UTC em todo o app (ver format.ts) —
 * por isso usa sempre os getters UTC, nunca os locais.
 */
export function cicloDaData(data: Date): Ciclo {
  const mes = data.getUTCMonth() + 1; // 1-12
  const anoInicio = mes >= 5 ? data.getUTCFullYear() : data.getUTCFullYear() - 1;

  return {
    anoInicio,
    label: `${anoInicio}/${anoInicio + 1}`,
    inicio: new Date(Date.UTC(anoInicio, 4, 1)), // 1º de maio, 00:00 UTC
    fim: new Date(Date.UTC(anoInicio + 1, 3, 30, 23, 59, 59, 999)), // 30 de abril, fim do dia UTC
  };
}

export function cicloAtual(): Ciclo {
  return cicloDaData(new Date());
}
