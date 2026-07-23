"use client";

import { TIPO_CONSERTO_LABELS } from "@/lib/tipo-conserto";
import { MultiArquivoInput } from "@/components/upload/multi-arquivo-input";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";

const TIPOS_CONSERTO = Object.entries(TIPO_CONSERTO_LABELS) as [keyof typeof TIPO_CONSERTO_LABELS, string][];

type ManutencaoFormValues = {
  data: string;
  servicoRealizado: string;
  tiposConserto: string[];
  pecasUtilizadas: string;
  valor: string;
  mecanico: string;
  observacoes: string;
};

type ManutencaoAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function ManutencaoForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: ManutencaoAction;
  defaultValues?: Partial<ManutencaoFormValues>;
  submitLabel: string;
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="data" className="mb-1 block text-sm font-medium text-neutral-700">
          Data *
        </label>
        <input
          id="data"
          name="data"
          type="date"
          required
          defaultValue={defaultValues?.data ?? new Date().toISOString().slice(0, 10)}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div>
        <label htmlFor="servicoRealizado" className="mb-1 block text-sm font-medium text-neutral-700">
          Serviço realizado *
        </label>
        <input
          id="servicoRealizado"
          name="servicoRealizado"
          required
          defaultValue={defaultValues?.servicoRealizado}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-neutral-700">Tipo de conserto</span>
        <div className="grid grid-cols-2 gap-2">
          {TIPOS_CONSERTO.map(([valor, label]) => (
            <label
              key={valor}
              className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
            >
              <input
                type="checkbox"
                name="tiposConserto[]"
                value={valor}
                defaultChecked={defaultValues?.tiposConserto?.includes(valor)}
                className="h-4 w-4"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="pecasUtilizadas" className="mb-1 block text-sm font-medium text-neutral-700">
          Peças utilizadas
        </label>
        <input
          id="pecasUtilizadas"
          name="pecasUtilizadas"
          defaultValue={defaultValues?.pecasUtilizadas}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div>
        <label htmlFor="valor" className="mb-1 block text-sm font-medium text-neutral-700">
          Valor (R$)
        </label>
        <input
          id="valor"
          name="valor"
          type="number"
          inputMode="decimal"
          step="0.01"
          defaultValue={defaultValues?.valor}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div>
        <label htmlFor="mecanico" className="mb-1 block text-sm font-medium text-neutral-700">
          Mecânico / oficina
        </label>
        <input
          id="mecanico"
          name="mecanico"
          defaultValue={defaultValues?.mecanico}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <MultiArquivoInput name="documentos" pasta="manutencoes" label="Notas fiscais / documentos (PDF)" />

      <div>
        <label htmlFor="observacoes" className="mb-1 block text-sm font-medium text-neutral-700">
          Observações
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          defaultValue={defaultValues?.observacoes}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      {erro}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-green-700 py-3 text-base font-medium text-white active:bg-green-800 disabled:opacity-60"
      >
        {rotulo(submitLabel)}
      </button>
    </form>
  );
}
