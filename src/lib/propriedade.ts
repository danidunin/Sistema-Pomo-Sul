import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

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

// ---------------------------------------------------------------------------
// Checagem de propriedade — todo update/delete que recebe um ID vindo de
// formulário/URL deve confirmar que o registro pertence à propriedade
// selecionada no momento, antes de gravar. Sem isso, uma aba antiga aberta ou
// um link salvo depois de trocar de fazenda pode alterar/apagar dado de uma
// propriedade que nem está selecionada na sessão (corrupção cross-tenant por
// acidente real, não invasão — todo usuário já pode acessar qualquer
// propriedade por design).
// ---------------------------------------------------------------------------

export async function garantirTalhaoDaPropriedade(talhaoId: string, propriedadeId: string): Promise<boolean> {
  const talhao = await db.talhao.findUnique({ where: { id: talhaoId }, select: { propriedadeId: true } });
  return talhao?.propriedadeId === propriedadeId;
}

export async function garantirProdutoDaPropriedade(produtoId: string, propriedadeId: string): Promise<boolean> {
  const produto = await db.produto.findUnique({ where: { id: produtoId }, select: { propriedadeId: true } });
  return produto?.propriedadeId === propriedadeId;
}

export async function garantirOperadorDaPropriedade(operadorId: string, propriedadeId: string): Promise<boolean> {
  const operador = await db.operador.findUnique({ where: { id: operadorId }, select: { propriedadeId: true } });
  return operador?.propriedadeId === propriedadeId;
}

export async function garantirMaquinaDaPropriedade(maquinaId: string, propriedadeId: string): Promise<boolean> {
  const maquina = await db.maquina.findUnique({ where: { id: maquinaId }, select: { propriedadeId: true } });
  return maquina?.propriedadeId === propriedadeId;
}

export async function garantirManutencaoDaPropriedade(manutencaoId: string, propriedadeId: string): Promise<boolean> {
  const manutencao = await db.manutencao.findUnique({
    where: { id: manutencaoId },
    select: { maquina: { select: { propriedadeId: true } } },
  });
  return manutencao?.maquina.propriedadeId === propriedadeId;
}

export async function garantirRevisaoDaPropriedade(revisaoId: string, propriedadeId: string): Promise<boolean> {
  const revisao = await db.revisao.findUnique({
    where: { id: revisaoId },
    select: { maquina: { select: { propriedadeId: true } } },
  });
  return revisao?.maquina.propriedadeId === propriedadeId;
}

export async function garantirContagemFrutosDaPropriedade(contagemId: string, propriedadeId: string): Promise<boolean> {
  const contagem = await db.contagemFrutos.findUnique({ where: { id: contagemId }, select: { propriedadeId: true } });
  return contagem?.propriedadeId === propriedadeId;
}

export async function garantirAtividadeDaPropriedade(atividadeId: string, propriedadeId: string): Promise<boolean> {
  const atividade = await db.atividade.findUnique({
    where: { id: atividadeId },
    select: { talhao: { select: { propriedadeId: true } } },
  });
  return atividade?.talhao.propriedadeId === propriedadeId;
}

export async function garantirVisitaDaPropriedade(visitaId: string, propriedadeId: string): Promise<boolean> {
  const visita = await db.visitaCampo.findUnique({
    where: { id: visitaId },
    select: { talhao: { select: { propriedadeId: true } } },
  });
  return visita?.talhao.propriedadeId === propriedadeId;
}

export async function garantirTanqueDaPropriedade(tanqueId: string, propriedadeId: string): Promise<boolean> {
  const tanque = await db.tanqueDiesel.findUnique({ where: { id: tanqueId }, select: { propriedadeId: true } });
  return tanque?.propriedadeId === propriedadeId;
}
