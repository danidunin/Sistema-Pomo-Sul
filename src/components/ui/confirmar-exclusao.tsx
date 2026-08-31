"use client";

import { useState } from "react";

type ConfirmarExclusaoProps = {
  pergunta?: string;
  className?: string;
} & (
  | { action: (formData: FormData) => void | Promise<void>; onConfirm?: never }
  | { onConfirm: () => void | Promise<void>; action?: never }
);

/**
 * Confirmação de exclusão feita na própria interface (dois cliques), em vez de
 * window.confirm() — diálogos nativos do navegador não são confiáveis em todo
 * contexto (ex: PWA instalado na tela do celular), e podiam fazer o clique em
 * "Excluir" simplesmente não funcionar sem nenhum aviso.
 */
export function ConfirmarExclusao({ action, onConfirm, pergunta = "Confirma excluir?", className }: ConfirmarExclusaoProps) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className={className ?? "rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600"}
      >
        Excluir
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-neutral-600">{pergunta}</span>
      {action ? (
        <form action={action}>
          <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white active:bg-red-700">
            Sim, excluir
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white active:bg-red-700"
        >
          Sim, excluir
        </button>
      )}
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
      >
        Cancelar
      </button>
    </div>
  );
}
