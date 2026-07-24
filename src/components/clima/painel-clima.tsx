import type { Clima, DiaDetalhado } from "@/lib/clima";
import { iconePorResumo } from "@/lib/clima";

/**
 * Painel de campo: previsão de temperatura oficial do INMET (Manhã/Tarde/Noite
 * para hoje e amanhã, resumo diário para os dias seguintes). Cada período mostra
 * o texto do resumo do INMET acompanhado de um ícone de condição (sol, nuvem,
 * chuva etc. — ver iconePorResumo em src/lib/clima.ts). Fundo sempre escuro de
 * propósito (mostrador de instrumento), independente do resto do app, que é
 * claro — por isso usa cores fixas via classes arbitrárias do Tailwind, em vez
 * da paleta clara do resto do sistema.
 */
export function PainelClima({ clima }: { clima: Clima | null }) {
  if (!clima) {
    return <PainelClimaVazio />;
  }

  return (
    <div className="relative col-span-2 flex flex-col gap-4 overflow-hidden rounded-xl bg-[#1c2321] p-4 text-[#f2efe7] md:col-span-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#8fa398]">
          Previsão de temperatura · INMET
        </p>
        <p className="text-[11px] text-[#8fa398]">Lapa, PR</p>
      </div>

      <BlocoDia titulo="Hoje" data={clima.hoje.data} dia={clima.hoje} />

      <div className="border-t border-[#384540] pt-4">
        <BlocoDia titulo="Amanhã" data={clima.amanha.data} dia={clima.amanha} />
      </div>

      {clima.proximosDias.length > 0 && (
        <div className="border-t border-[#384540] pt-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8fa398]">
            Próximos dias
          </p>
          <div className="grid grid-cols-3 gap-2">
            {clima.proximosDias.map((dia) => {
              const Icone = iconePorResumo(dia.resumo);
              return (
                <div key={dia.data} className="flex flex-col gap-0.5 rounded-lg bg-[#212a27] p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#8fa398]">
                    {dia.diaSemana.replace("-Feira", "").slice(0, 3)}
                  </span>
                  <Icone className="h-4 w-4 text-[#8fa398]" strokeWidth={1.75} />
                  <span className="text-lg font-bold tabular-nums">
                    {dia.temperaturaMaxima}° <span className="text-sm font-normal text-[#8fa398]">{dia.temperaturaMinima}°</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BlocoDia({ titulo, data, dia }: { titulo: string; data: string; dia: DiaDetalhado }) {
  return (
    <div>
      <p className="mb-2 flex items-baseline gap-2 text-sm font-bold">
        {titulo}
        <span className="font-normal text-[#8fa398]">· {data.slice(0, 5)}</span>
        <span className="ml-auto tabular-nums">
          {dia.temperaturaMaxima}° <span className="text-[#8fa398]">{dia.temperaturaMinima}°</span>
        </span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        {dia.periodos.map((p) => {
          const Icone = iconePorResumo(p.resumo);
          return (
            <div key={p.nome} className="flex flex-col gap-1 rounded-lg bg-[#212a27] p-3">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#8fa398]">
                {p.nome}
              </span>
              <div className="flex items-center gap-1.5">
                <Icone className="h-4 w-4 shrink-0 text-[#8fa398]" strokeWidth={1.75} />
                <span className="text-[11px] leading-snug">{p.resumo}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PainelClimaVazio() {
  return (
    <div className="col-span-2 flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-4 md:col-span-4">
      <span className="text-sm font-medium text-neutral-700">Previsão de temperatura</span>
      <span className="text-sm text-neutral-500">Clima indisponível no momento.</span>
    </div>
  );
}
