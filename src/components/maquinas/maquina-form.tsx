"use client";

import { FotoInput } from "@/components/upload/foto-input";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type MaquinaFormValues = {
  nome: string;
  marca: string;
  modelo: string;
  ano: string;
  horimetroAtual: string;
  observacoes: string;
  fotoUrl: string;
};

type MaquinaAction = (
  prevState: string | undefined,
  formData: FormData,
) => Promise<string | undefined>;

export function MaquinaForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: MaquinaAction;
  defaultValues?: Partial<MaquinaFormValues>;
  submitLabel: string;
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FotoInput name="fotoUrl" pasta="maquinas" label="Foto da máquina" defaultUrl={defaultValues?.fotoUrl} />

      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-neutral-700">
          Nome *
        </label>
        <input
          id="nome"
          name="nome"
          required
          placeholder="ex: Trator Valtra 07"
          defaultValue={defaultValues?.nome}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="marca" className="mb-1 block text-sm font-medium text-neutral-700">
            Marca
          </label>
          <input
            id="marca"
            name="marca"
            defaultValue={defaultValues?.marca}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label htmlFor="modelo" className="mb-1 block text-sm font-medium text-neutral-700">
            Modelo
          </label>
          <input
            id="modelo"
            name="modelo"
            defaultValue={defaultValues?.modelo}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="ano" className="mb-1 block text-sm font-medium text-neutral-700">
            Ano
          </label>
          <input
            id="ano"
            name="ano"
            type="number"
            inputMode="numeric"
            defaultValue={defaultValues?.ano}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label htmlFor="horimetroAtual" className="mb-1 block text-sm font-medium text-neutral-700">
            Horímetro atual
          </label>
          <input
            id="horimetroAtual"
            name="horimetroAtual"
            type="number"
            inputMode="decimal"
            step="0.1"
            defaultValue={defaultValues?.horimetroAtual}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
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
