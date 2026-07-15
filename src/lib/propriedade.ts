import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const COOKIE_PROPRIEDADE = "propriedade_atual";

/** Lê a propriedade selecionada no cookie do dispositivo. Pode ser null. */
export async function propriedadeAtualId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_PROPRIEDADE)?.value ?? null;
}

/** Como propriedadeAtualId, mas redireciona para a Home se nenhuma propriedade estiver selecionada. */
export async function exigirPropriedadeAtual(): Promise<string> {
  const id = await propriedadeAtualId();
  if (!id) redirect("/");
  return id;
}
