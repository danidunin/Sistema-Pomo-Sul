"use client";

import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type Ponto = { id: string; nome: string; safra: string };
type Talhao = { id: string; nome: string };

export type ValoresIniciaisArmadilha = {
  pontoMonitoramentoId: string;
  talhaoId: string;
  rotulo: string;
};

type ArmadilhaAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function ArmadilhaForm({
  action,
  pontos,
  talhoes,
  defaultValues,
  submitLabel,
}: {
  action: ArmadilhaAction;
  pontos: Ponto[];
  talhoes: Talhao[];
  defaultValues?: Partial<ValoresIniciaisArmadilha>;
  submitLabel: string;
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="pontoMonitoramentoId" className="mb-1 block text-sm font-medium text-neutral-700">
          Ponto de monitoramento *
        </label>
        <select
          id="pontoMonitoramentoId"
          name="pontoMonitoramentoId"
          required
          defaultValue={defaultValues?.pontoMonitoramentoId ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {pontos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} · safra {p.safra}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="talhaoId" className="mb-1 block text-sm font-medium text-neutral-700">
          Talhão *
        </label>
        <select
          id="talhaoId"
          name="talhaoId"
          required
          defaultValue={defaultValues?.talhaoId ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {talhoes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="rotulo" className="mb-1 block text-sm font-medium text-neutral-700">
          Rótulo da armadilha *
        </label>
        <input
          id="rotulo"
          name="rotulo"
          required
          placeholder="ex: 4-Kampai 11"
          defaultValue={defaultValues?.rotulo}
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
