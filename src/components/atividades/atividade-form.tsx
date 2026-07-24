"use client";

import { useState } from "react";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type Opcao = { id: string; nome: string };

type AtividadeFormValues = {
  tipoAtividadeId: string;
  talhaoId: string;
  data: string;
  numeroPessoas: string;
  horasPorPessoa: string;
  horasMaquina: string;
  observacoes: string;
};

type AtividadeAction = (
  prevState: string | undefined,
  formData: FormData,
) => Promise<string | undefined>;

export function AtividadeForm({
  tiposAtividade,
  talhoes,
  action,
  defaultValues,
  submitLabel = "Registrar atividade",
}: {
  tiposAtividade: Opcao[];
  talhoes: Opcao[];
  action: AtividadeAction;
  defaultValues?: Partial<AtividadeFormValues>;
  submitLabel?: string;
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);
  const [numeroPessoas, setNumeroPessoas] = useState(defaultValues?.numeroPessoas ?? "");
  const [horasPorPessoa, setHorasPorPessoa] = useState(defaultValues?.horasPorPessoa ?? "");
  const [tipoAtividadeId, setTipoAtividadeId] = useState(defaultValues?.tipoAtividadeId ?? "");

  const tipoSelecionado = tiposAtividade.find((t) => t.id === tipoAtividadeId);
  const talhaoObrigatorio = tipoSelecionado?.nome !== "Chuva";

  const horasHomem =
    numeroPessoas && horasPorPessoa ? Number(numeroPessoas) * Number(horasPorPessoa) : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="tipoAtividadeId" className="mb-1 block text-sm font-medium text-neutral-700">
            Tipo de atividade *
          </label>
          <select
            id="tipoAtividadeId"
            name="tipoAtividadeId"
            required
            value={tipoAtividadeId}
            onChange={(e) => setTipoAtividadeId(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            <option value="" disabled>
              Selecione...
            </option>
            {tiposAtividade.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nome}
              </option>
            ))}
          </select>
        </div>
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
      </div>

      <div>
        <label htmlFor="talhaoId" className="mb-1 block text-sm font-medium text-neutral-700">
          Talhão{talhaoObrigatorio ? " *" : ""}
        </label>
        <select
          id="talhaoId"
          name="talhaoId"
          required={talhaoObrigatorio}
          defaultValue={defaultValues?.talhaoId ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="">{talhaoObrigatorio ? "Selecione..." : "Nenhum (atividade geral)"}</option>
          {talhoes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        {!talhaoObrigatorio && (
          <p className="mt-1 text-xs text-neutral-500">
            "Chuva" é uma parada geral da equipe — não precisa de um talhão específico.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="numeroPessoas" className="mb-1 block text-sm font-medium text-neutral-700">
            Quantidade de pessoas *
          </label>
          <input
            id="numeroPessoas"
            name="numeroPessoas"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            required
            value={numeroPessoas}
            onChange={(e) => setNumeroPessoas(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label htmlFor="horasPorPessoa" className="mb-1 block text-sm font-medium text-neutral-700">
            Horas por pessoa *
          </label>
          <input
            id="horasPorPessoa"
            name="horasPorPessoa"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            required
            value={horasPorPessoa}
            onChange={(e) => setHorasPorPessoa(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      </div>

      {horasHomem !== null && (
        <p className="-mt-2 text-xs text-neutral-500">
          = {horasHomem.toLocaleString("pt-BR")} horas-homem
        </p>
      )}

      <div>
        <label htmlFor="horasMaquina" className="mb-1 block text-sm font-medium text-neutral-700">
          Horas de máquina
        </label>
        <input
          id="horasMaquina"
          name="horasMaquina"
          type="number"
          inputMode="decimal"
          step="0.5"
          placeholder="Se utilizou mecanização"
          defaultValue={defaultValues?.horasMaquina}
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
