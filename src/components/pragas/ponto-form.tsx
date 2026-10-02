"use client";

import { useState } from "react";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";
import { TIPO_PRAGA_LABELS } from "@/lib/pragas";
import { Button } from "@/components/ui/button";

export type ValoresIniciaisPonto = {
  tipoPraga: string;
  nome: string;
  safra: string;
};

type PontoAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function PontoForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: PontoAction;
  defaultValues?: Partial<ValoresIniciaisPonto>;
  submitLabel: string;
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);
  const [safra, setSafra] = useState(defaultValues?.safra ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="tipoPraga" className="mb-1 block text-sm font-medium text-neutral-700">
          Praga *
        </label>
        <select
          id="tipoPraga"
          name="tipoPraga"
          required
          defaultValue={defaultValues?.tipoPraga ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {Object.entries(TIPO_PRAGA_LABELS).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-neutral-700">
          Nome do ponto *
        </label>
        <input
          id="nome"
          name="nome"
          required
          placeholder="ex: SEDE, Gala, Firminha"
          defaultValue={defaultValues?.nome}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Agrupa as armadilhas avaliadas em conjunto (a média do grupo é o que define o nível de controle).
        </p>
      </div>

      <div>
        <label htmlFor="safra" className="mb-1 block text-sm font-medium text-neutral-700">
          Safra *
        </label>
        <input
          id="safra"
          name="safra"
          required
          placeholder="ex: 2026/2027"
          value={safra}
          onChange={(e) => setSafra(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      {erro}

      <Button type="submit" disabled={isPending} size="lg">
        {rotulo(submitLabel)}
      </Button>
    </form>
  );
}
