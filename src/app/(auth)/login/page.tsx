"use client";

import Image from "next/image";
import { login } from "@/actions/auth";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";

export default function LoginPage() {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(login);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="relative h-64 shrink-0 overflow-hidden md:h-auto md:w-1/2 lg:w-3/5">
        <Image
          src="/images/hero-fazenda.jpg"
          alt="Vista aérea da propriedade Pomo Sul"
          fill
          priority
          className="object-cover [object-position:50%_75%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-green-900/80 via-green-900/20 to-green-900/50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center md:items-start md:text-left">
          <Image
            src="/images/logo-pomosul-transparente.png"
            alt="Pomo Sul — Agricultura e Comércio de Frutas"
            width={1000}
            height={692}
            priority
            className="h-28 w-auto drop-shadow-[0_4px_20px_rgba(0,0,0,0.35)] md:h-36"
          />
          <p className="max-w-xs text-sm font-medium uppercase tracking-[0.2em] text-white/85 md:max-w-sm">
            Sistema de Gestão Operacional
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white px-6 py-10 md:px-12">
        <div className="w-full max-w-sm">
          <h1 className="mb-1 text-2xl font-bold text-neutral-900">Entrar</h1>
          <p className="mb-7 text-sm text-neutral-500">Use seu e-mail e senha para acessar o sistema.</p>

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

            {erro}

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full rounded-lg bg-green-700 py-3 text-base font-medium text-white active:bg-green-800 disabled:opacity-60"
            >
              {rotulo("Entrar", "Entrando...")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
