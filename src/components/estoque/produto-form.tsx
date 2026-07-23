"use client";

import { UNIDADE_DOSAGEM_LABELS } from "@/lib/concentracao";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type ProdutoFormValues = {
  nome: string;
  unidade: string;
  unidadeDosagem: string;
  observacoes: string;
};

type ProdutoAction = (
  prevState: string | undefined,
  formData: FormData,
) => Promise<string | undefined>;

export function ProdutoForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: ProdutoAction;
  defaultValues?: Partial<ProdutoFormValues>;
  submitLabel: string;
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-neutral-700">
          Nome do produto *
        </label>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={defaultValues?.nome}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div>
        <label htmlFor="unidade" className="mb-1 block text-sm font-medium text-neutral-700">
          Unidade de estoque *
        </label>
        <input
          id="unidade"
          name="unidade"
          placeholder="ex: L, kg, un, sc"
          required
          defaultValue={defaultValues?.unidade}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div>
        <label htmlFor="unidadeDosagem" className="mb-1 block text-sm font-medium text-neutral-700">
          Unidade de dosagem
        </label>
        <select
          id="unidadeDosagem"
          name="unidadeDosagem"
          defaultValue={defaultValues?.unidadeDosagem ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="">Não se aplica</option>
          {Object.entries(UNIDADE_DOSAGEM_LABELS).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-neutral-500">
          Necessária para calcular a quantidade automaticamente em Tratamentos Fitossanitários.
        </p>
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
