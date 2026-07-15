"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_PROPRIEDADE } from "@/lib/propriedade";

const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

export async function definirPropriedadeAtual(propriedadeId: string) {
  const store = await cookies();
  store.set(COOKIE_PROPRIEDADE, propriedadeId, {
    maxAge: UM_ANO_EM_SEGUNDOS,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  redirect("/");
}

export async function esquecerPropriedadeAtual() {
  const store = await cookies();
  store.delete(COOKIE_PROPRIEDADE);
  redirect("/");
}
