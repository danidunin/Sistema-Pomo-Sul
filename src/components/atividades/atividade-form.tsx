"use client";

import { useActionState, useState } from "react";
import { criarAtividade } from "@/actions/atividades";

type Opcao = { id: string; nome: string };

export function AtividadeForm({
  tiposAtividade,
  talhoes,
}: {
  tiposAtividade: Opcao[];
  talhoes: Opcao[];
}) {
  const [errorMessage, formAction, isPending] = useActionState(criarAtividade, undefined);
  const [numeroPessoas, setNumeroPessoas] = useState("");
  const [horasPorPessoa, setHorasPorPessoa] = useState("");

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
            defaultValue=""
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
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      </div>

      <div>
        <label htmlFor="talhaoId" className="mb-1 block text-sm font-medium text-neutral-700">
          Talhão *
        </label>
        <select
          id="talhaoId"
          name="talhaoId"
          required
          defaultValue=""
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
        {isPending ? "Salvando..." : "Registrar atividade"}
      </button>
    </form>
  );
}
