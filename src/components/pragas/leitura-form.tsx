"use client";

import { useFormularioAcao } from "@/hooks/use-formulario-acao";
import { Button } from "@/components/ui/button";

type LeituraAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function LeituraForm({
  action,
  armadilhaRotulo,
  defaultValues,
}: {
  action: LeituraAction;
  armadilhaRotulo: string;
  defaultValues: { data: string; quantidade: string };
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">Armadilha: {armadilhaRotulo}</p>

      <div>
        <label htmlFor="data" className="mb-1 block text-sm font-medium text-neutral-700">
          Data *
        </label>
        <input
          id="data"
          name="data"
          type="date"
          required
          defaultValue={defaultValues.data}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div>
        <label htmlFor="quantidade" className="mb-1 block text-sm font-medium text-neutral-700">
          Quantidade capturada *
        </label>
        <input
          id="quantidade"
          name="quantidade"
          type="number"
          inputMode="numeric"
          min={0}
          step="1"
          required
          defaultValue={defaultValues.quantidade}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      {erro}

      <Button type="submit" disabled={isPending} size="lg">
        {rotulo("Salvar alterações")}
      </Button>
    </form>
  );
}
