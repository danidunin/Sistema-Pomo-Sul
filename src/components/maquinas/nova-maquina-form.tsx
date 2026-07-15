"use client";

import { useActionState } from "react";
import { criarMaquina } from "@/actions/maquinas";
import { FotoInput } from "@/components/upload/foto-input";

export function NovaMaquinaForm() {
  const [errorMessage, formAction, isPending] = useActionState(criarMaquina, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FotoInput name="fotoUrl" pasta="maquinas" label="Foto da máquina" />

      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-neutral-700">
          Nome *
        </label>
        <input
          id="nome"
          name="nome"
          required
          placeholder="ex: Trator Valtra 07"
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
        {isPending ? "Salvando..." : "Criar máquina"}
      </button>
    </form>
  );
}
