import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { respostaRelatorio } from "@/lib/export-response";
import { formatarData } from "@/lib/format";
import { propriedadeAtualId } from "@/lib/propriedade";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Não autenticado.", { status: 401 });

  const propriedadeId = await propriedadeAtualId();
  if (!propriedadeId) return new Response("Nenhuma propriedade selecionada.", { status: 400 });

  const formato = new URL(request.url).searchParams.get("formato");

  const atividades = await db.atividade.findMany({
    where: { talhao: { propriedadeId } },
    orderBy: { data: "desc" },
    include: { tipoAtividade: true, talhao: true },
  });

  const linhas = atividades.map((atividade) => ({
    data: formatarData(atividade.data),
    tipo: atividade.tipoAtividade.nome,
    talhao: atividade.talhao.nomeCodinome,
    pessoas: atividade.numeroPessoas,
    horasPorPessoa: Number(atividade.horasPorPessoa),
    horasHomem: atividade.numeroPessoas * Number(atividade.horasPorPessoa),
    observacoes: atividade.observacoes,
  }));

  return respostaRelatorio(
    formato,
    "atividades",
    "Atividades",
    [
      { chave: "data", titulo: "Data" },
      { chave: "tipo", titulo: "Atividade" },
      { chave: "talhao", titulo: "Talhão", largura: 22 },
      { chave: "pessoas", titulo: "Pessoas" },
      { chave: "horasPorPessoa", titulo: "Horas/pessoa" },
      { chave: "horasHomem", titulo: "Horas-homem" },
      { chave: "observacoes", titulo: "Observações", largura: 30 },
    ],
    linhas,
  );
}
