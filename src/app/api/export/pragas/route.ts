import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { respostaRelatorio } from "@/lib/export-response";
import { formatarData } from "@/lib/format";
import { propriedadeAtualId } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS } from "@/lib/pragas";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Não autenticado.", { status: 401 });

  const propriedadeId = await propriedadeAtualId();
  if (!propriedadeId) return new Response("Nenhuma propriedade selecionada.", { status: 400 });

  const formato = new URL(request.url).searchParams.get("formato");

  const leituras = await db.leituraArmadilha.findMany({
    where: { armadilha: { pontoMonitoramento: { propriedadeId } } },
    orderBy: { data: "desc" },
    include: {
      armadilha: {
        include: {
          talhao: { select: { nomeCodinome: true } },
          pontoMonitoramento: { select: { nome: true, tipoPraga: true, safra: true } },
        },
      },
    },
  });

  const linhas = leituras.map((l) => ({
    data: formatarData(l.data),
    praga: TIPO_PRAGA_LABELS[l.armadilha.pontoMonitoramento.tipoPraga],
    safra: l.armadilha.pontoMonitoramento.safra,
    ponto: l.armadilha.pontoMonitoramento.nome,
    armadilha: l.armadilha.rotulo,
    talhao: l.armadilha.talhao.nomeCodinome,
    quantidade: l.quantidade,
  }));

  return respostaRelatorio(
    formato,
    "monitoramento-pragas",
    "Monitoramento de Pragas",
    [
      { chave: "data", titulo: "Data" },
      { chave: "praga", titulo: "Praga", largura: 22 },
      { chave: "safra", titulo: "Safra" },
      { chave: "ponto", titulo: "Ponto", largura: 18 },
      { chave: "armadilha", titulo: "Armadilha", largura: 18 },
      { chave: "talhao", titulo: "Talhão", largura: 22 },
      { chave: "quantidade", titulo: "Quantidade" },
    ],
    linhas,
  );
}
