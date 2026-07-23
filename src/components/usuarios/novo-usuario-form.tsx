"use client";

import { useRef, useEffect } from "react";
import { criarUsuario } from "@/actions/usuarios";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";

export function NovoUsuarioForm() {
  const { formAction, errorMessage, isPending, erro, rotulo } = useFormularioAcao(criarUsuario);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isPending && !errorMessage) {
      formRef.current?.reset();
    }
  }, [isPending, errorMessage]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-medium text-neutral-700">Novo usuário</h2>

      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-neutral-700">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          required
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>
      <div>
        <label htmlFor="senha" className="mb-1 block text-sm font-medium text-neutral-700">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          placeholder="Mín. 6 caracteres"
          required
          minLength={6}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      {erro}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-green-700 py-3 text-base font-medium text-white active:bg-green-800 disabled:opacity-60"
      >
        {rotulo("Adicionar usuário")}
      </button>
    </form>
  );
}
