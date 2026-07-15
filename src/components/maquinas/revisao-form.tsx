"use client";

import { useActionState } from "react";

type RevisaoFormValues = {
  data: string;
  servicoRealizado: string;
  horimetro: string;
  observacoes: string;
};

type RevisaoAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function RevisaoForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: RevisaoAction;
  defaultValues?: Partial<RevisaoFormValues>;
  submitLabel: string;
}) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);

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
            defaultValue={defaultValues?.data ?? new Date().toISOString().slice(0, 10)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label htmlFor="horimetro" className="mb-1 block text-sm font-medium text-neutral-700">
            Horímetro *
          </label>
          <input
            id="horimetro"
            name="horimetro"
            type="number"
            inputMode="decimal"
            step="0.1"
            required
            defaultValue={defaultValues?.horimetro}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      </div>

      <div>
        <label htmlFor="servicoRealizado" className="mb-1 block text-sm font-medium text-neutral-700">
          Serviço realizado *
        </label>
        <input
          id="servicoRealizado"
          name="servicoRealizado"
          required
          placeholder="Ex: Troca de óleo, troca de filtro..."
          defaultValue={defaultValues?.servicoRealizado}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

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

      {errorMessage && (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-green-700 py-3 text-base font-medium text-white active:bg-green-800 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
