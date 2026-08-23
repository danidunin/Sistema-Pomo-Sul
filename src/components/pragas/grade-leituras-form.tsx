"use client";

import { useRouter } from "next/navigation";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type ArmadilhaGrade = { id: string; rotulo: string; talhaoNome: string };
type PontoGrade = { id: string; nome: string; armadilhas: ArmadilhaGrade[] };

type GradeAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function GradeLeiturasForm({
  action,
  tipoPraga,
  safra,
  data,
  valoresExistentes,
  pontos,
}: {
  action: GradeAction;
  tipoPraga: string;
  safra: string;
  /** Data da leitura (yyyy-mm-dd) — vem da URL para o servidor poder pré-preencher a grade. */
  data: string;
  /** Quantidade já registrada nessa data, por armadilha. */
  valoresExistentes: Record<string, number>;
  pontos: PontoGrade[];
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);
  const router = useRouter();

  // Trocar a data renavega para a mesma página com `?data=`, para que o servidor
  // recarregue as leituras já registradas nessa data e pré-preencha os campos.
  function aoTrocarData(novaData: string) {
    if (!novaData) return;
    const params = new URLSearchParams({ tipoPraga, safra, data: novaData });
    router.replace(`/monitoramento-pragas/nova?${params.toString()}`);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="tipoPraga" value={tipoPraga} />
      <input type="hidden" name="safra" value={safra} />

      <div>
        <label htmlFor="data" className="mb-1 block text-sm font-medium text-neutral-700">
          Data da leitura *
        </label>
        <input
          id="data"
          name="data"
          type="date"
          required
          defaultValue={data}
          onChange={(e) => aoTrocarData(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      {pontos.map((ponto) => (
        <div key={ponto.id} className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-neutral-900">{ponto.nome}</p>
          {ponto.armadilhas.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma armadilha ativa neste ponto.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {ponto.armadilhas.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3">
                  <label htmlFor={`quantidade-${a.id}`} className="flex-1 text-sm text-neutral-600">
                    {a.rotulo} <span className="text-neutral-400">· {a.talhaoNome}</span>
                  </label>
                  <input type="hidden" name="armadilhaId[]" value={a.id} />
                  <input
                    // A `key` inclui a data para o campo remontar ao trocar de data —
                    // sem isso o input não controlado manteria o valor da data anterior.
                    key={`${data}-${a.id}`}
                    id={`quantidade-${a.id}`}
                    name="quantidade[]"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step="1"
                    defaultValue={valoresExistentes[a.id] ?? ""}
                    className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {erro}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-green-700 py-3 text-base font-medium text-white active:bg-green-800 disabled:opacity-60"
      >
        {rotulo("Salvar leituras")}
      </button>
    </form>
  );
}
