import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buscarHorasHomem } from "@/lib/relatorios";
import { respostaRelatorio } from "@/lib/export-response";
import { formatarData } from "@/lib/format";
import { propriedadeAtualId } from "@/lib/propriedade";
import type { LinhaRelatorio } from "@/lib/export";
import type { TipoOperacao } from "@/generated/prisma/enums";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Não autenticado.", { status: 401 });

  const propriedadeId = await propriedadeAtualId();
  if (!propriedadeId) return new Response("Nenhuma propriedade selecionada.", { status: 400 });

  const params = new URL(request.url).searchParams;
  const formato = params.get("formato");

  const [{ linhas, total }, propriedade] = await Promise.all([
    buscarHorasHomem(propriedadeId, {
      dataInicio: params.get("dataInicio") ?? undefined,
      dataFim: params.get("dataFim") ?? undefined,
      talhaoId: params.get("talhaoId") ?? undefined,
      cultura: params.get("cultura") ?? undefined,
      tipoAtividadeId: params.get("tipoAtividadeId") ?? undefined,
      tipoTratamento: (params.get("tipoTratamento") as TipoOperacao | null) ?? undefined,
    }),
    db.propriedade.findUnique({ where: { id: propriedadeId }, select: { nome: true } }),
  ]);

  const linhasRelatorio: LinhaRelatorio[] = linhas.map((l) => ({
    data: formatarData(l.data),
    origem: l.origem,
    descricao: l.descricao,
    talhao: l.talhao,
    pessoas: l.numeroPessoas,
    horasPorPessoa: l.horasPorPessoa,
    horas: l.horas,
  }));
  linhasRelatorio.push({
    data: null,
    origem: null,
    descricao: null,
    talhao: null,
    pessoas: null,
    horasPorPessoa: null,
    horas: total,
  });

  return respostaRelatorio(
    formato,
    "horas-homem",
    `${propriedade?.nome ?? "Propriedade"} — Hora-Homem`,
    [
      { chave: "data", titulo: "Data" },
      { chave: "origem", titulo: "Origem" },
      { chave: "descricao", titulo: "Descrição", largura: 22 },
      { chave: "talhao", titulo: "Talhão", largura: 22 },
      { chave: "pessoas", titulo: "Pessoas" },
      { chave: "horasPorPessoa", titulo: "Horas/pessoa" },
      { chave: "horas", titulo: "Horas-homem" },
    ],
    linhasRelatorio,
  );
}
