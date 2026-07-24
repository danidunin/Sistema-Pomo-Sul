import Link from "next/link";
import { formatarData } from "@/lib/format";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { buscarChuvaRegistros, resumirChuvaPorMes } from "@/lib/chuva";

export default async function ChuvaPage() {
  const propriedadeId = await exigirPropriedadeAtual();
  const leituras = await buscarChuvaRegistros(propriedadeId);
  const resumoMensal = resumirChuvaPorMes(
    leituras.map((l) => ({ data: l.data, quantidadeMm: l.quantidadeMm.toString() })),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Controle de Chuva</h1>
        <Link
          href="/chuva/nova"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova leitura
        </Link>
      </div>

      {resumoMensal.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {resumoMensal.map((mes) => (
            <div
              key={mes.mes}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0"
            >
              <span className="text-sm font-medium capitalize text-neutral-900">{mes.label}</span>
              <span className="text-sm text-neutral-600">
                {mes.quantidadeEventos} {mes.quantidadeEventos === 1 ? "evento" : "eventos"} ·{" "}
                {mes.totalMm.toLocaleString("pt-BR")} mm
              </span>
            </div>
          ))}
        </div>
      )}

      {leituras.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma leitura registrada ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {leituras.map((leitura) => (
            <Link
              key={leitura.id}
              href={`/chuva/${leitura.id}/editar`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {formatarData(leitura.data)} · {Number(leitura.quantidadeMm).toLocaleString("pt-BR")} mm
                </p>
                {leitura.observacoes && <p className="text-xs text-neutral-500">{leitura.observacoes}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
