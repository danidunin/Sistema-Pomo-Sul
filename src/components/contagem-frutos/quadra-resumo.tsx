import type { GrupoQuadraSafra } from "@/lib/contagem-frutos";
import { formatarData } from "@/lib/format";

const formatoKg = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const formatoNumero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const formatoInteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function QuadraResumoConteudo({ grupo }: { grupo: GrupoQuadraSafra }) {
  const progressoMeta =
    grupo.metaFrutosPorPlanta > 0 ? Math.min(100, (grupo.mediaFrutosPorPlanta / grupo.metaFrutosPorPlanta) * 100) : 0;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-neutral-900">
          {grupo.talhaoNome} <span className="font-normal text-neutral-400">· safra {grupo.safra}</span>
        </p>
        <span className="whitespace-nowrap text-sm font-semibold text-neutral-900">
          {formatoKg.format(grupo.produtividadeEstimadaKgHa)} kg/ha
        </span>
      </div>
      <p className="mt-0.5 text-xs text-neutral-500">
        {grupo.numeroContagens} {grupo.numeroContagens === 1 ? "contagem" : "contagens"} · última{" "}
        {formatarData(grupo.dataUltimaContagem)}
      </p>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className={progressoMeta >= 100 ? "h-full bg-green-600" : "h-full bg-amber-500"}
          style={{ width: `${progressoMeta}%` }}
        />
      </div>
      <p className="mt-0.5 text-xs text-neutral-500">
        média {formatoNumero.format(grupo.mediaFrutosPorPlanta)} de meta {formatoNumero.format(grupo.metaFrutosPorPlanta)}
      </p>

      {grupo.percentualAmostrado != null && (
        <>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full bg-blue-600"
                style={{ width: `${Math.min(100, grupo.percentualAmostrado)}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-[11px] font-medium text-blue-700">
              {formatoInteiro.format(grupo.percentualAmostrado)}% amostrado
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-neutral-400">
            {formatoInteiro.format(grupo.totalPlantasAmostradas)} de{" "}
            {formatoInteiro.format(grupo.numeroPlantasTalhao ?? 0)} plantas
          </p>
        </>
      )}
    </div>
  );
}
