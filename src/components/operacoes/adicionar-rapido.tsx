"use client";

import { useState, useTransition } from "react";

type ItemCriado = { id: string; nome: string };

/**
 * Cadastro rápido inline de Operador/Máquina durante o lançamento de um
 * Tratamento — evita ter que abandonar o formulário em andamento, cadastrar
 * em outra tela e recomeçar do zero.
 */
export function AdicionarRapido({
  label,
  action,
  onCriado,
}: {
  label: string;
  action: (nome: string) => Promise<ItemCriado | { erro: string }>;
  onCriado: (item: ItemCriado) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="mt-1 text-xs font-medium text-green-700">
        + {label}
      </button>
    );
  }

  function handleAdicionar() {
    if (!nome.trim()) return;
    startTransition(async () => {
      const resultado = await action(nome.trim());
      if ("erro" in resultado) {
        setErro(resultado.erro);
        return;
      }
      onCriado(resultado);
      setNome("");
      setErro(null);
      setAberto(false);
    });
  }

  return (
    <div className="mt-1 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={`Nome do ${label.toLowerCase()}`}
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={handleAdicionar}
          className="rounded-lg bg-green-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Adicionar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-xs text-neutral-500"
        >
          Cancelar
        </button>
      </div>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
