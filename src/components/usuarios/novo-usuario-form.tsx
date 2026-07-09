"use client";

import { useActionState, useRef, useEffect } from "react";
import { criarUsuario } from "@/actions/usuarios";

export function NovoUsuarioForm() {
  const [errorMessage, formAction, isPending] = useActionState(criarUsuario, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isPending && !errorMessage) {
      formRef.current?.reset();
    }
  }, [isPending, errorMessage]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-medium text-neutral-700">Novo usuário</h2>

      <input
        name="nome"
        placeholder="Nome"
        required
        className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
      />
      <input
        name="email"
        type="email"
        inputMode="email"
        placeholder="E-mail"
        required
        className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
      />
      <input
        name="senha"
        type="password"
        placeholder="Senha (mín. 6 caracteres)"
        required
        minLength={6}
        className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
      />

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
        {isPending ? "Salvando..." : "Adicionar usuário"}
      </button>
    </form>
  );
}
