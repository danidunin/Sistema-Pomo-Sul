import { formatarData } from "@/lib/format";
import type { AbaTabela } from "@/lib/planilha-pragas-parser";

export function PlanilhaTabela({ aba }: { aba: AbaTabela }) {
  return (
    // min-w-0: este card é filho de um container flex (flex flex-col) na página — sem isso
    // a tabela larga empurra a PÁGINA INTEIRA além da viewport no mobile, quebrando o rodapé
    // fixo em outras telas do app (bug real já visto e corrigido na grade de Monitoramento
    // de Pragas — ver grade-excel.tsx).
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-white">
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
              {aba.cabecalhoGrupo.map((grupo, i) => (
                <th
                  key={i}
                  colSpan={grupo.colSpan}
                  className="whitespace-nowrap border-b border-r border-neutral-200 bg-neutral-50 px-3 py-2 text-center font-medium text-neutral-700"
                >
                  {grupo.rotulo}
                </th>
              ))}
            </tr>
            <tr>
              {aba.cabecalhoColuna.map((rotulo, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap border-b border-neutral-200 px-2 py-1.5 text-center text-xs font-normal text-neutral-500"
                >
                  {rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {aba.linhas.map((linha, i) => (
              <tr key={i} className="border-b border-neutral-100 last:border-b-0">
                <td className="sticky left-0 z-10 whitespace-nowrap border-r border-neutral-200 bg-white px-3 py-1.5 text-neutral-700">
                  {linha.celulas[0].valor instanceof Date ? formatarData(linha.celulas[0].valor) : ""}
                </td>
                {linha.celulas.slice(1).map((celula, j) => (
                  <td
                    key={j}
                    className="px-2 py-1.5 text-center"
                    style={celula.corHex ? { color: celula.corHex, fontWeight: 600 } : undefined}
                  >
                    {celula.valor instanceof Date
                      ? formatarData(celula.valor)
                      : (celula.valor ?? <span className="text-neutral-300">—</span>)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
