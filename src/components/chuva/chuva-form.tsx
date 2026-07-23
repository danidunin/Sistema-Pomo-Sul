"use client";

import { useState } from "react";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type ChuvaFormValues = {
  data: string;
  quantidadeMm: string;
  relacaoTratamentoDia: string;
  observacoes: string;
};

type ChuvaAction = (
  prevState: string | undefined,
  formData: FormData,
) => Promise<string | undefined>;

export function ChuvaForm({
  action,
  defaultValues,
  submitLabel = "Registrar leitura",
  datasComTratamento,
}: {
  action: ChuvaAction;
  defaultValues?: Partial<ChuvaFormValues>;
  submitLabel?: string;
  /** Datas (YYYY-MM-DD) em que já existe algum tratamento fitossanitário registrado. */
  datasComTratamento: string[];
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);
  const [data, setData] = useState(defaultValues?.data ?? new Date().toISOString().slice(0, 10));

  const coincideComTratamento = datasComTratamento.includes(data);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="data" className="mb-1 block text-sm font-medium text-neutral-700">
            Data *
          </label>
          <input
            id="data"
            name="data"
            type="date"
            required
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label htmlFor="quantidadeMm" className="mb-1 block text-sm font-medium text-neutral-700">
            Quantidade (mm) *
          </label>
          <input
            id="quantidadeMm"
            name="quantidadeMm"
            type="number"
            inputMode="decimal"
            min="0.1"
            step="0.1"
            required
            defaultValue={defaultValues?.quantidadeMm}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      </div>

      {coincideComTratamento && (
        <div>
          <label htmlFor="relacaoTratamentoDia" className="mb-1 block text-sm font-medium text-neutral-700">
            Essa chuva caiu antes ou depois da aplicação desse dia?
          </label>
          <select
            id="relacaoTratamentoDia"
            name="relacaoTratamentoDia"
            defaultValue={defaultValues?.relacaoTratamentoDia ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            <option value="">Não sei / não importa</option>
            <option value="ANTES">Antes da aplicação</option>
            <option value="DEPOIS">Depois da aplicação</option>
          </select>
          <p className="mt-1 text-xs text-neutral-500">
            Há um tratamento fitossanitário registrado nessa data — isso define se a chuva
            conta para o tratamento que estava em andamento ou para esse novo.
          </p>
        </div>
      )}

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
