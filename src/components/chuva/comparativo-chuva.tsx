import Link from "next/link";
import type { ComparativoMensalChuva, PeriodoComumChuva } from "@/lib/chuva";
import { Card } from "@/components/ui/card";

export type PropriedadeChuva = {
  id: string;
  nome: string;
  corClasse: string;
  ehAtual: boolean;
  /** Mês (YYYY-MM) da primeira leitura já registrada; antes disso a propriedade não media chuva. */
  primeiroMes: string | null;
  primeiraLeitura: Date | null;
};

function mm(valor: number) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mm`;
}

export function ComparativoChuva({
  propriedades,
  linhas,
  periodoComum,
  ano,
  anos,
  hrefAno,
}: {
  propriedades: PropriedadeChuva[];
  linhas: ComparativoMensalChuva[];
  periodoComum: PeriodoComumChuva | null;
  ano: string;
  anos: string[];
  hrefAno: (ano: string) => string;
}) {
  const totais = propriedades.map((p) => {
    let totalMm = 0;
    let leituras = 0;
    for (const linha of linhas) {
      totalMm += linha.porPropriedade[p.id]?.totalMm ?? 0;
      leituras += linha.porPropriedade[p.id]?.quantidadeEventos ?? 0;
    }
    const comecouNoAno = p.primeiraLeitura?.toISOString().slice(0, 4) === ano;
    return { propriedade: p, totalMm, leituras, comecouNoAno };
  });

  const maxMm = Math.max(1, ...linhas.flatMap((l) => Object.values(l.porPropriedade).map((v) => v.totalMm)));
  const doisLados = totais.length === 2;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-neutral-900">
          {propriedades.length > 1 ? "Comparativo entre propriedades" : "Resumo mensal"}
        </h2>
        {anos.length > 1 && (
          <div className="flex gap-1.5">
            {anos.map((a) => (
              <Link
                key={a}
                href={hrefAno(a)}
                scroll={false}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                  a === ano
                    ? "border-green-700 bg-green-50 text-green-800 active:bg-green-100"
                    : "border-neutral-300 text-neutral-700 active:bg-neutral-100"
                }`}
              >
                {a}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {totais.map(({ propriedade, totalMm, leituras, comecouNoAno }) => (
          <div key={propriedade.id} className="rounded-xl bg-neutral-50 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${propriedade.corClasse}`} aria-hidden />
              <span className="truncate">{propriedade.nome}</span>
              {propriedade.ehAtual && <span className="text-neutral-400">· atual</span>}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">
              {totalMm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
              <span className="ml-1 text-sm font-normal text-neutral-500">mm</span>
            </p>
            <p className="text-xs text-neutral-500">
              {leituras === 0
                ? `Nenhuma leitura em ${ano}`
                : `${leituras} ${leituras === 1 ? "leitura" : "leituras"} em ${ano}`}
            </p>
            {comecouNoAno && propriedade.primeiraLeitura && (
              <p className="text-xs text-neutral-500">
                registra desde{" "}
                {propriedade.primeiraLeitura.toLocaleDateString("pt-BR", {
                  timeZone: "UTC",
                  day: "2-digit",
                  month: "2-digit",
                })}
              </p>
            )}
          </div>
        ))}
      </div>

      {doisLados && <ResumoDiferenca totais={totais} periodoComum={periodoComum} ano={ano} />}

      {linhas.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma leitura registrada em {ano}.</p>
      ) : (
        <div className="flex flex-col">
          {linhas.map((linha) => {
            const valores = propriedades.map((p) => ({
              propriedade: p,
              dados: linha.porPropriedade[p.id],
              semRegistro: !p.primeiroMes || linha.mes < p.primeiroMes,
            }));
            const comparaveis = valores.filter((v) => !v.semRegistro);
            const diferenca =
              doisLados && comparaveis.length === 2
                ? (comparaveis[0].dados?.totalMm ?? 0) - (comparaveis[1].dados?.totalMm ?? 0)
                : null;

            return (
              <div key={linha.mes} className="border-t border-neutral-100 py-3 last:pb-0">
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-neutral-900">{linha.label}</span>
                  {diferenca !== null && (
                    <span className="text-xs text-neutral-500">
                      {Math.abs(diferenca) < 0.05
                        ? "mesmo volume"
                        : `${comparaveis[diferenca > 0 ? 0 : 1].propriedade.nome} +${mm(Math.abs(diferenca))}`}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  {valores.map(({ propriedade, dados, semRegistro }) => (
                    <div
                      key={propriedade.id}
                      className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-2 md:grid-cols-[7rem_1fr_6rem]"
                    >
                      <span className="truncate text-xs text-neutral-600">{propriedade.nome}</span>
                      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100" aria-hidden>
                        {dados && (
                          <div
                            className={`h-full rounded-full ${propriedade.corClasse}`}
                            style={{ width: `${Math.max(2, (dados.totalMm / maxMm) * 100)}%` }}
                          />
                        )}
                      </div>
                      <span
                        className={`text-right text-xs tabular-nums ${
                          semRegistro ? "text-neutral-400" : "font-medium text-neutral-800"
                        }`}
                      >
                        {semRegistro ? "sem registro" : mm(dados?.totalMm ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ResumoDiferenca({
  totais,
  periodoComum,
  ano,
}: {
  totais: { propriedade: PropriedadeChuva; leituras: number }[];
  periodoComum: PeriodoComumChuva | null;
  ano: string;
}) {
  const semLeitura = totais.find((t) => t.leituras === 0);
  if (semLeitura) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        {semLeitura.propriedade.nome} ainda não tem leituras em {ano}. O comparativo fica completo assim que as duas
        propriedades tiverem lançamentos.
      </p>
    );
  }
  if (!periodoComum) return null;

  const [maior, menor] = totais
    .map((t) => ({ nome: t.propriedade.nome, totalMm: periodoComum.totais[t.propriedade.id] ?? 0 }))
    .sort((a, b) => b.totalMm - a.totalMm);
  const diferenca = maior.totalMm - menor.totalMm;
  const percentual = menor.totalMm > 0 ? Math.round((diferenca / menor.totalMm) * 100) : null;
  const periodo = periodoComum.desdeInicioDoAno ? (
    `Em ${ano}`
  ) : (
    <>
      Desde{" "}
      {periodoComum.inicio.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" })}, quando
      as duas passaram a registrar ({maior.nome} {mm(maior.totalMm)} × {menor.nome} {mm(menor.totalMm)})
    </>
  );

  if (diferenca < 0.05) {
    return <p className="text-sm text-neutral-600">{periodo}, as duas propriedades receberam o mesmo volume.</p>;
  }

  return (
    <p className="text-sm text-neutral-600">
      {periodo}, <span className="font-medium text-neutral-900">{maior.nome}</span> recebeu{" "}
      <span className="font-medium text-neutral-900">{mm(diferenca)}</span> a mais que {menor.nome}
      {percentual !== null && ` (+${percentual}%)`}.
    </p>
  );
}
