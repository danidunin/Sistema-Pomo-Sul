import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { respostaRelatorio } from "@/lib/export-response";
import { UNIDADE_DOSAGEM_LABELS } from "@/lib/concentracao";
import { propriedadeAtualId } from "@/lib/propriedade";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Não autenticado.", { status: 401 });

  const propriedadeId = await propriedadeAtualId();
  if (!propriedadeId) return new Response("Nenhuma propriedade selecionada.", { status: 400 });

  const formato = new URL(request.url).searchParams.get("formato");

  const [produtos, propriedade] = await Promise.all([
    db.produto.findMany({ where: { propriedadeId }, orderBy: { nome: "asc" } }),
    db.propriedade.findUnique({ where: { id: propriedadeId }, select: { nome: true } }),
  ]);

  return respostaRelatorio(
    formato,
    "estoque",
    `${propriedade?.nome ?? "Propriedade"} — Estoque`,
    [
      { chave: "nome", titulo: "Produto", largura: 24 },
      { chave: "quantidade", titulo: "Quantidade disponível" },
      { chave: "unidade", titulo: "Unidade" },
      { chave: "unidadeDosagem", titulo: "Unidade de dosagem" },
      { chave: "observacoes", titulo: "Observações", largura: 30 },
    ],
    produtos.map((p) => ({
      nome: p.nome,
      quantidade: Number(p.quantidadeDisponivel),
      unidade: p.unidade,
      unidadeDosagem: p.unidadeDosagem ? UNIDADE_DOSAGEM_LABELS[p.unidadeDosagem] : null,
      observacoes: p.observacoes,
    })),
  );
}
