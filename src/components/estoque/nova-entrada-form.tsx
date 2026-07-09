"use client";

import { useActionState } from "react";
import { criarMovimentacaoEntrada } from "@/actions/estoque";

export function NovaEntradaForm({ produtos }: { produtos: { id: string; nome: string; unidade: string }[] }) {
  const [errorMessage, formAction, isPending] = useActionState(criarMovimentacaoEntrada, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="produtoId" className="mb-1 block text-sm font-medium text-neutral-700">
          Produto *
        </label>
        <select
          id="produtoId"
          name="produtoId"
          required
          defaultValue=""
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {produtos.map((produto) => (
            <option key={produto.id} value={produto.id}>
              {produto.nome} ({produto.unidade})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="quantidade" className="mb-1 block text-sm font-medium text-neutral-700">
            Quantidade *
          </label>
          <input
            id="quantidade"
            name="quantidade"
            type="number"
            inputMode="decimal"
            step="0.001"
            required
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
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
        {isPending ? "Salvando..." : "Registrar entrada"}
      </button>
    </form>
  );
}
