"use client";

import { useActionState } from "react";
import { criarProduto } from "@/actions/estoque";

export function NovoProdutoForm() {
  const [errorMessage, formAction, isPending] = useActionState(criarProduto, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-neutral-700">
          Nome do produto *
        </label>
        <input
          id="nome"
          name="nome"
          required
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div>
        <label htmlFor="unidade" className="mb-1 block text-sm font-medium text-neutral-700">
          Unidade *
        </label>
        <input
          id="unidade"
          name="unidade"
          placeholder="ex: L, kg, un, sc"
          required
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
        {isPending ? "Salvando..." : "Criar produto"}
      </button>
    </form>
  );
}
