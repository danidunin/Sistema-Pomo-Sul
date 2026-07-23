"use client";

import { FotoInput } from "@/components/upload/foto-input";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type OperadorFormValues = {
  nomeCompleto: string;
  apelido: string;
  cpf: string;
  telefone: string;
  funcao: string;
  equipe: string;
  ativo: boolean;
  observacoes: string;
  fotoUrl: string;
};

type OperadorAction = (
  prevState: string | undefined,
  formData: FormData,
) => Promise<string | undefined>;

export function OperadorForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: OperadorAction;
  defaultValues?: Partial<OperadorFormValues>;
  submitLabel: string;
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FotoInput name="fotoUrl" pasta="operadores" label="Foto" defaultUrl={defaultValues?.fotoUrl} />

      <div>
        <label htmlFor="nomeCompleto" className="mb-1 block text-sm font-medium text-neutral-700">
          Nome completo *
        </label>
        <input
          id="nomeCompleto"
          name="nomeCompleto"
          required
          defaultValue={defaultValues?.nomeCompleto}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="apelido" className="mb-1 block text-sm font-medium text-neutral-700">
            Apelido
          </label>
          <input
            id="apelido"
            name="apelido"
            defaultValue={defaultValues?.apelido}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label htmlFor="telefone" className="mb-1 block text-sm font-medium text-neutral-700">
            Telefone
          </label>
          <input
            id="telefone"
            name="telefone"
            type="tel"
            inputMode="tel"
            defaultValue={defaultValues?.telefone}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="cpf" className="mb-1 block text-sm font-medium text-neutral-700">
            CPF
          </label>
          <input
            id="cpf"
            name="cpf"
            inputMode="numeric"
            defaultValue={defaultValues?.cpf}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label htmlFor="funcao" className="mb-1 block text-sm font-medium text-neutral-700">
            Função/cargo
          </label>
          <input
            id="funcao"
            name="funcao"
            placeholder="ex: Tratorista"
            defaultValue={defaultValues?.funcao}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      </div>

      <div>
        <label htmlFor="equipe" className="mb-1 block text-sm font-medium text-neutral-700">
          Equipe
        </label>
        <input
          id="equipe"
          name="equipe"
          defaultValue={defaultValues?.equipe}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={defaultValues?.ativo ?? true}
          className="h-5 w-5 rounded border-neutral-300"
        />
        Ativo
      </label>

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
