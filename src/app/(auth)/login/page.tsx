"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";

export default function LoginPage() {
  const [errorMessage, formAction, isPending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-neutral-900">POMO SUL</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Entre com seu e-mail e senha
        </p>

        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
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
              autoComplete="current-password"
              required
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
            className="mt-2 w-full rounded-lg bg-green-700 py-3 text-base font-medium text-white active:bg-green-800 disabled:opacity-60"
          >
            {isPending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
