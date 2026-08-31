import { Fragment } from "react";
import Link from "next/link";
import { formatarData } from "@/lib/format";
import { CORES_NIVEL, rotuloMetrica, type SecaoGrade } from "@/lib/pragas";

/**
 * Grade estilo planilha: uma linha por data, uma coluna por armadilha
 * agrupada sob o nome do ponto, com uma coluna "Média" colorida por nível de
 * controle ao final de cada grupo — a mesma divisão e leiaute da Excel
 * original, para quem já está acostumado a ler os dados assim.
 */
export function GradeExcelPraga({ titulo, secao }: { titulo: string; secao: SecaoGrade }) {
  if (secao.pontos.length === 0) return null;

  const labelMetrica = rotuloMetrica(secao.tipoPraga);

  return (
    // min-w-0: este card é filho direto de um container flex (flex flex-col
    // na página) — sem min-w-0 um item flex nunca encolhe abaixo da largura
    // do seu conteúdo, então a tabela larga empurraria a PÁGINA INTEIRA (não
    // só este card) além da viewport no mobile, quebrando o rodapé fixo em
    // outras telas do app. Com min-w-0, é o overflow-x-auto logo abaixo que
    // rola, e a página nunca ultrapassa a largura da tela.
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-4 py-3">
        <p className="text-sm font-semibold text-neutral-900">{titulo}</p>
      </div>

      {secao.linhas.length === 0 ? (
        <p className="px-4 py-3 text-sm text-neutral-500">Nenhuma leitura registrada ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-10 border-b border-r border-neutral-200 bg-neutral-50 px-3 py-2 text-left align-bottom font-medium text-neutral-600"
                >
                  Data
                </th>
                {secao.pontos.map((ponto) => (
                  <th
                    key={ponto.id}
                    colSpan={ponto.armadilhas.length + 2}
                    className="border-b border-r border-neutral-200 bg-neutral-50 px-3 py-2 text-center font-medium text-neutral-700"
                  >
                    <Link href={`/monitoramento-pragas/pontos/${ponto.id}`} className="hover:underline">
                      {ponto.variedade ?? ponto.nome}
                    </Link>
                  </th>
                ))}
              </tr>
              <tr>
                {secao.pontos.map((ponto) => (
                  <Fragment key={ponto.id}>
                    {ponto.armadilhas.map((armadilha) => (
                      <th
                        key={armadilha.id}
                        className="whitespace-nowrap border-b border-neutral-200 px-2 py-1.5 text-center text-xs font-normal text-neutral-500"
                      >
                        {armadilha.rotulo}
                      </th>
                    ))}
                    <th className="whitespace-nowrap border-b border-neutral-200 bg-neutral-50 px-2 py-1.5 text-center text-xs font-semibold text-neutral-700">
                      Média
                    </th>
                    <th className="whitespace-nowrap border-b border-r border-neutral-200 bg-neutral-50 px-2 py-1.5 text-center text-xs font-semibold text-neutral-700">
                      {labelMetrica}
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {secao.linhas.map((linha) => (
                <tr key={linha.data.toISOString()} className="border-b border-neutral-100 last:border-b-0">
                  <td className="sticky left-0 z-10 whitespace-nowrap border-r border-neutral-200 bg-white px-3 py-1.5 text-neutral-700">
                    {formatarData(linha.data)}
                  </td>
                  {secao.pontos.map((ponto) => {
                    const celula = linha.porPonto[ponto.id];
                    return (
                      <Fragment key={ponto.id}>
                        {ponto.armadilhas.map((armadilha) => (
                          <td key={armadilha.id} className="px-2 py-1.5 text-center text-neutral-600">
                            {linha.porArmadilha[armadilha.id] ?? <span className="text-neutral-300">—</span>}
                          </td>
                        ))}
                        <td className="px-2 py-1.5 text-center text-neutral-600">
                          {celula ? celula.media.toFixed(1) : "—"}
                        </td>
                        <td
                          className={`border-r border-neutral-200 px-2 py-1.5 text-center font-medium ${
                            celula ? CORES_NIVEL[celula.nivel].badge : "text-neutral-300"
                          }`}
                        >
                          {celula ? celula.metrica.toFixed(1) : "—"}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
