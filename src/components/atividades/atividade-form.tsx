"use client";

import { useActionState, useState } from "react";
import { criarAtividade } from "@/actions/atividades";

type Opcao = { id: string; nome: string };

let proximaChave = 0;

export function AtividadeForm({
  tiposAtividade,
  talhoes,
  usuarios,
}: {
  tiposAtividade: Opcao[];
  talhoes: Opcao[];
  usuarios: Opcao[];
}) {
  const [errorMessage, formAction, isPending] = useActionState(criarAtividade, undefined);
  const [linhas, setLinhas] = useState(() => [proximaChave++]);

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

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700">Funcionários e horas *</span>
          <button
            type="button"
            onClick={() => setLinhas((atual) => [...atual, proximaChave++])}
            className="text-sm font-medium text-green-700"
          >
            + Adicionar funcionário
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {linhas.map((chave) => (
            <LinhaFuncionario
              key={chave}
              usuarios={usuarios}
              onRemover={
                linhas.length > 1 ? () => setLinhas((atual) => atual.filter((l) => l !== chave)) : undefined
              }
            />
          ))}
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

function LinhaFuncionario({
  usuarios,
  onRemover,
}: {
  usuarios: Opcao[];
  onRemover?: () => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <select
          name="usuarioId[]"
          required
          defaultValue=""
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="" disabled>
            Selecione o funcionário...
          </option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="w-28">
        <input
          name="horas[]"
          type="number"
          inputMode="decimal"
          step="0.5"
          required
          placeholder="Horas"
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>
      {onRemover && (
        <button
          type="button"
          onClick={onRemover}
          className="rounded-lg border border-neutral-300 px-3 py-3 text-sm text-neutral-500"
          aria-label="Remover funcionário"
        >
          ✕
        </button>
      )}
    </div>
  );
}
