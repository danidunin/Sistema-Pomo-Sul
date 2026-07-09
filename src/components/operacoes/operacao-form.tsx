"use client";

import { useActionState, useState } from "react";
import { criarOperacao } from "@/actions/operacoes";

type Opcao = { id: string; nome: string };
type ProdutoOpcao = { id: string; nome: string; unidade: string };

const TIPOS = [
  { value: "FITOSSANITARIO", label: "Tratamento fitossanitário" },
  { value: "HERBICIDA", label: "Herbicida" },
  { value: "ADUBACAO", label: "Adubação" },
  { value: "OUTRA", label: "Outra" },
];

let proximaChave = 0;

export function OperacaoForm({
  talhoes,
  produtos,
  usuarios,
  maquinas,
}: {
  talhoes: Opcao[];
  produtos: ProdutoOpcao[];
  usuarios: Opcao[];
  maquinas: Opcao[];
}) {
  const [errorMessage, formAction, isPending] = useActionState(criarOperacao, undefined);
  const [tipo, setTipo] = useState("FITOSSANITARIO");
  const [linhas, setLinhas] = useState(() => [proximaChave++]);

  const precisaVolumeCalda = tipo === "FITOSSANITARIO" || tipo === "HERBICIDA";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="tipo" className="mb-1 block text-sm font-medium text-neutral-700">
            Tipo de operação *
          </label>
          <select
            id="tipo"
            name="tipo"
            required
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
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
          <span className="text-sm font-medium text-neutral-700">Produtos *</span>
          <button
            type="button"
            onClick={() => setLinhas((atual) => [...atual, proximaChave++])}
            className="text-sm font-medium text-green-700"
          >
            + Adicionar produto
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {linhas.map((chave) => (
            <LinhaProduto
              key={chave}
              produtos={produtos}
              onRemover={
                linhas.length > 1 ? () => setLinhas((atual) => atual.filter((l) => l !== chave)) : undefined
              }
            />
          ))}
        </div>
      </div>

      {precisaVolumeCalda && (
        <div>
          <label htmlFor="volumeCalda" className="mb-1 block text-sm font-medium text-neutral-700">
            Volume de calda (L)
          </label>
          <input
            id="volumeCalda"
            name="volumeCalda"
            type="number"
            inputMode="decimal"
            step="0.01"
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="operadorId" className="mb-1 block text-sm font-medium text-neutral-700">
            Operador
          </label>
          <select
            id="operadorId"
            name="operadorId"
            defaultValue=""
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            <option value="">Não informado</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="maquinaId" className="mb-1 block text-sm font-medium text-neutral-700">
            Máquina utilizada
          </label>
          <select
            id="maquinaId"
            name="maquinaId"
            defaultValue=""
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            <option value="">Nenhuma</option>
            {maquinas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
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
        {isPending ? "Salvando..." : "Registrar operação"}
      </button>
    </form>
  );
}

function LinhaProduto({
  produtos,
  onRemover,
}: {
  produtos: ProdutoOpcao[];
  onRemover?: () => void;
}) {
  const [produtoId, setProdutoId] = useState("");
  const unidade = produtos.find((p) => p.id === produtoId)?.unidade ?? "";

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <select
          name="produtoId[]"
          required
          value={produtoId}
          onChange={(e) => setProdutoId(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="" disabled>
            Selecione o produto...
          </option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="w-28">
        <input
          name="quantidade[]"
          type="number"
          inputMode="decimal"
          step="0.001"
          required
          placeholder={unidade ? `Qtd. (${unidade})` : "Qtd."}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>
      <input type="hidden" name="unidade[]" value={unidade} />
      {onRemover && (
        <button
          type="button"
          onClick={onRemover}
          className="rounded-lg border border-neutral-300 px-3 py-3 text-sm text-neutral-500"
          aria-label="Remover produto"
        >
          ✕
        </button>
      )}
    </div>
  );
}
