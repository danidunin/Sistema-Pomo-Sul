"use client";

import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type TanqueFormValues = {
  nome: string;
  capacidadeLitros: string;
  estoqueAtualLitros: string;
  estoqueMinimoLitros: string;
};

type TanqueAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function TanqueForm({
  action,
  defaultValues,
  submitLabel,
  exibirEstoqueAtual,
}: {
  action: TanqueAction;
  defaultValues?: Partial<TanqueFormValues>;
  submitLabel: string;
  exibirEstoqueAtual: boolean;
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-neutral-700">
          Nome do tanque *
        </label>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={defaultValues?.nome}
          placeholder="ex: Tanque principal"
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="capacidadeLitros" className="mb-1 block text-sm font-medium text-neutral-700">
            Capacidade (litros) *
          </label>
          <input
            id="capacidadeLitros"
            name="capacidadeLitros"
            type="number"
            inputMode="decimal"
            step="0.01"
            required
            defaultValue={defaultValues?.capacidadeLitros}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label htmlFor="estoqueMinimoLitros" className="mb-1 block text-sm font-medium text-neutral-700">
            Estoque mínimo (litros) *
          </label>
          <input
            id="estoqueMinimoLitros"
            name="estoqueMinimoLitros"
            type="number"
            inputMode="decimal"
            step="0.01"
            required
            defaultValue={defaultValues?.estoqueMinimoLitros}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      </div>

      {exibirEstoqueAtual && (
        <div>
          <label htmlFor="estoqueAtualLitros" className="mb-1 block text-sm font-medium text-neutral-700">
            Estoque atual (litros) *
          </label>
          <input
            id="estoqueAtualLitros"
            name="estoqueAtualLitros"
            type="number"
            inputMode="decimal"
            step="0.01"
            required
            defaultValue={defaultValues?.estoqueAtualLitros}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Leitura inicial do tanque no momento do cadastro. Depois disso, o saldo é atualizado
            automaticamente pelas entradas e saídas registradas.
          </p>
        </div>
      )}

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
