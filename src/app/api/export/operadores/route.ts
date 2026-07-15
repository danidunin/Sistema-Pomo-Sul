import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { respostaRelatorio } from "@/lib/export-response";
import { propriedadeAtualId } from "@/lib/propriedade";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Não autenticado.", { status: 401 });

  const propriedadeId = await propriedadeAtualId();
  if (!propriedadeId) return new Response("Nenhuma propriedade selecionada.", { status: 400 });

  const formato = new URL(request.url).searchParams.get("formato");

  const operadores = await db.operador.findMany({ where: { propriedadeId }, orderBy: { nomeCompleto: "asc" } });

  return respostaRelatorio(
    formato,
    "operadores",
    "Operadores",
    [
      { chave: "nome", titulo: "Nome completo", largura: 24 },
      { chave: "apelido", titulo: "Apelido" },
      { chave: "telefone", titulo: "Telefone" },
      { chave: "funcao", titulo: "Função" },
      { chave: "equipe", titulo: "Equipe" },
      { chave: "status", titulo: "Status" },
    ],
    operadores.map((o) => ({
      nome: o.nomeCompleto,
      apelido: o.apelido,
      telefone: o.telefone,
      funcao: o.funcao,
      equipe: o.equipe,
      status: o.ativo ? "Ativo" : "Inativo",
    })),
  );
}
