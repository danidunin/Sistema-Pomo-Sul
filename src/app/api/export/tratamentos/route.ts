import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { respostaRelatorio } from "@/lib/export-response";
import { TIPO_OPERACAO_LABELS } from "@/lib/operacoes";
import { UNIDADE_DOSAGEM_LABELS } from "@/lib/concentracao";
import { formatarData } from "@/lib/format";
import type { LinhaRelatorio } from "@/lib/export";
import { propriedadeAtualId } from "@/lib/propriedade";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Não autenticado.", { status: 401 });

  const propriedadeId = await propriedadeAtualId();
  if (!propriedadeId) return new Response("Nenhuma propriedade selecionada.", { status: 400 });

  const formato = new URL(request.url).searchParams.get("formato");

  const operacoes = await db.operacaoAgricola.findMany({
    where: { talhao: { propriedadeId } },
    orderBy: [{ data: "desc" }, { createdAt: "asc" }],
    include: { talhao: true, produtos: { include: { produto: true } } },
  });

  const linhas: LinhaRelatorio[] = [];
  for (const op of operacoes) {
    const base = {
      data: formatarData(op.data),
      tipo: TIPO_OPERACAO_LABELS[op.tipo],
      talhao: op.talhao.nomeCodinome,
      volumeCalda: op.volumeCalda ? Number(op.volumeCalda) : null,
      pessoas: op.numeroPessoas,
      horasHomem: op.numeroPessoas && op.horasPorPessoa ? op.numeroPessoas * Number(op.horasPorPessoa) : null,
      horasMaquina: op.horasMaquina ? Number(op.horasMaquina) : null,
    };

    if (op.produtos.length === 0) {
      linhas.push({ ...base, produto: null, concentracao: null, quantidade: null });
      continue;
    }

    for (const item of op.produtos) {
      linhas.push({
        ...base,
        produto: item.produto.nome,
        concentracao: item.concentracao
          ? `${item.concentracao.toString()} ${item.produto.unidadeDosagem ? UNIDADE_DOSAGEM_LABELS[item.produto.unidadeDosagem] : ""}`
          : null,
        quantidade: `${item.quantidade.toString()} ${item.unidade}`,
      });
    }
  }

  return respostaRelatorio(
    formato,
    "tratamentos",
    "Tratamentos Fitossanitários",
    [
      { chave: "data", titulo: "Data" },
      { chave: "tipo", titulo: "Tipo" },
      { chave: "talhao", titulo: "Talhão", largura: 22 },
      { chave: "produto", titulo: "Produto", largura: 22 },
      { chave: "concentracao", titulo: "Concentração" },
      { chave: "quantidade", titulo: "Quantidade" },
      { chave: "volumeCalda", titulo: "Volume de calda (L)" },
      { chave: "pessoas", titulo: "Pessoas" },
      { chave: "horasHomem", titulo: "Horas-homem" },
      { chave: "horasMaquina", titulo: "Horas de máquina" },
    ],
    linhas,
  );
}
