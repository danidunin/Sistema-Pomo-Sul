"use client";

import { useActionState, useState } from "react";
import { criarMovimentacaoEstoque } from "@/actions/estoque";

type Produto = { id: string; nome: string; unidade: string; quantidadeDisponivel: number };

export function MovimentacaoForm({ produtos, tipoInicial }: { produtos: Produto[]; tipoInicial: "ENTRADA" | "SAIDA" }) {
  const [errorMessage, formAction, isPending] = useActionState(criarMovimentacaoEstoque, undefined);
  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA">(tipoInicial);
  const [produtoId, setProdutoId] = useState("");

  const produtoSelecionado = produtos.find((p) => p.id === produtoId);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Tipo *</label>
        <div className="flex gap-2">
          {(["ENTRADA", "SAIDA"] as const).map((opcao) => (
            <label
              key={opcao}
              className={`flex-1 cursor-pointer rounded-lg border px-4 py-3 text-center text-sm font-medium ${
                tipo === opcao
                  ? "border-green-600 bg-green-50 text-green-800"
                  : "border-neutral-300 text-neutral-700"
              }`}
            >
              <input
                type="radio"
                name="tipo"
                value={opcao}
                checked={tipo === opcao}
                onChange={() => setTipo(opcao)}
                className="sr-only"
              />
              {opcao === "ENTRADA" ? "Entrada" : "Saída"}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="produtoId" className="mb-1 block text-sm font-medium text-neutral-700">
          Produto *
        </label>
        <select
          id="produtoId"
          name="produtoId"
          required
          value={produtoId}
          onChange={(e) => setProdutoId(e.target.value)}
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
        {tipo === "SAIDA" && produtoSelecionado && (
          <p className="mt-1 text-xs text-neutral-500">
            Disponível: {produtoSelecionado.quantidadeDisponivel} {produtoSelecionado.unidade}
          </p>
        )}
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
          placeholder={
            tipo === "SAIDA" ? "Ex: perda, descarte, correção de inventário..." : undefined
          }
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
        {isPending ? "Salvando..." : tipo === "ENTRADA" ? "Registrar entrada" : "Registrar saída"}
      </button>
    </form>
  );
}
