"use client";

import { useState } from "react";
import { criarMovimentacaoDiesel } from "@/actions/diesel";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type Tanque = { id: string; nome: string; estoqueAtualLitros: number };

export function MovimentacaoDieselForm({
  tanques,
  tipoInicial,
}: {
  tanques: Tanque[];
  tipoInicial: "ENTRADA" | "SAIDA";
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(criarMovimentacaoDiesel);
  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA">(tipoInicial);
  const [tanqueId, setTanqueId] = useState(tanques[0]?.id ?? "");

  const tanqueSelecionado = tanques.find((t) => t.id === tanqueId);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Tipo *</label>
        <div className="flex gap-2">
          {(["ENTRADA", "SAIDA"] as const).map((opcao) => (
            <label
              key={opcao}
              className={`flex-1 cursor-pointer rounded-lg border px-4 py-3 text-center text-sm font-medium ${
                tipo === opcao ? "border-green-600 bg-green-50 text-green-800" : "border-neutral-300 text-neutral-700"
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

      {tanques.length > 1 ? (
        <div>
          <label htmlFor="tanqueId" className="mb-1 block text-sm font-medium text-neutral-700">
            Tanque *
          </label>
          <select
            id="tanqueId"
            name="tanqueId"
            required
            value={tanqueId}
            onChange={(e) => setTanqueId(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            {tanques.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="tanqueId" value={tanqueId} />
      )}

      {tipo === "SAIDA" && tanqueSelecionado && (
        <p className="text-xs text-neutral-500">
          Disponível: {tanqueSelecionado.estoqueAtualLitros.toLocaleString("pt-BR")} L
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="quantidadeLitros" className="mb-1 block text-sm font-medium text-neutral-700">
            Quantidade (litros) *
          </label>
          <input
            id="quantidadeLitros"
            name="quantidadeLitros"
            type="number"
            inputMode="decimal"
            step="0.01"
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

      {erro}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-green-700 py-3 text-base font-medium text-white active:bg-green-800 disabled:opacity-60"
      >
        {rotulo(tipo === "ENTRADA" ? "Registrar entrada" : "Registrar saída")}
      </button>
    </form>
  );
}
