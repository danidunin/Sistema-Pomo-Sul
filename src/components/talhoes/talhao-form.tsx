"use client";

import { useActionState } from "react";

type TalhaoFormValues = {
  nomeCodinome: string;
  areaHa: string;
  especie: string;
  variedade: string;
  portaEnxerto: string;
  anoPlantio: string;
  espacamento: string;
  numeroPlantas: string;
  observacoes: string;
};

type TalhaoAction = (
  prevState: string | undefined,
  formData: FormData,
) => Promise<string | undefined>;

export function TalhaoForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: TalhaoAction;
  defaultValues?: Partial<TalhaoFormValues>;
  submitLabel: string;
}) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="nomeCodinome" className="mb-1 block text-sm font-medium text-neutral-700">
          Nome/codinome *
        </label>
        <input
          id="nomeCodinome"
          name="nomeCodinome"
          required
          defaultValue={defaultValues?.nomeCodinome}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="areaHa" className="mb-1 block text-sm font-medium text-neutral-700">
            Área (ha)
          </label>
          <input
            id="areaHa"
            name="areaHa"
            type="number"
            inputMode="decimal"
            step="0.01"
            defaultValue={defaultValues?.areaHa}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label htmlFor="especie" className="mb-1 block text-sm font-medium text-neutral-700">
            Espécie
          </label>
          <input
            id="especie"
            name="especie"
            defaultValue={defaultValues?.especie}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="variedade" className="mb-1 block text-sm font-medium text-neutral-700">
            Variedade
          </label>
          <input
            id="variedade"
            name="variedade"
            defaultValue={defaultValues?.variedade}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label htmlFor="portaEnxerto" className="mb-1 block text-sm font-medium text-neutral-700">
            Porta-enxerto
          </label>
          <input
            id="portaEnxerto"
            name="portaEnxerto"
            defaultValue={defaultValues?.portaEnxerto}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="anoPlantio" className="mb-1 block text-sm font-medium text-neutral-700">
            Ano de plantio
          </label>
          <input
            id="anoPlantio"
            name="anoPlantio"
            type="number"
            inputMode="numeric"
            defaultValue={defaultValues?.anoPlantio}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label htmlFor="espacamento" className="mb-1 block text-sm font-medium text-neutral-700">
            Espaçamento
          </label>
          <input
            id="espacamento"
            name="espacamento"
            placeholder="ex: 4m x 2m"
            defaultValue={defaultValues?.espacamento}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      </div>

      <div>
        <label htmlFor="numeroPlantas" className="mb-1 block text-sm font-medium text-neutral-700">
          Número de plantas
        </label>
        <input
          id="numeroPlantas"
          name="numeroPlantas"
          type="number"
          inputMode="numeric"
          defaultValue={defaultValues?.numeroPlantas}
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
