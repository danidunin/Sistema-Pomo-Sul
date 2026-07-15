import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { respostaRelatorio } from "@/lib/export-response";
import { formatarData } from "@/lib/format";
import { propriedadeAtualId } from "@/lib/propriedade";
import { TIPO_CONSERTO_LABELS } from "@/lib/tipo-conserto";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Não autenticado.", { status: 401 });

  const propriedadeId = await propriedadeAtualId();
  if (!propriedadeId) return new Response("Nenhuma propriedade selecionada.", { status: 400 });

  const params = new URL(request.url).searchParams;
  const formato = params.get("formato");
  const maquinaId = params.get("maquinaId");
  if (!maquinaId) return new Response("Máquina não informada.", { status: 400 });

  const maquina = await db.maquina.findUnique({ where: { id: maquinaId }, select: { nome: true, propriedadeId: true } });
  if (!maquina || maquina.propriedadeId !== propriedadeId) {
    return new Response("Máquina não encontrada.", { status: 404 });
  }

  const manutencoes = await db.manutencao.findMany({ where: { maquinaId }, orderBy: { data: "desc" } });

  return respostaRelatorio(
    formato,
    "manutencoes",
    `${maquina.nome} — Histórico de manutenção`,
    [
      { chave: "data", titulo: "Data" },
      { chave: "servicoRealizado", titulo: "Serviço realizado", largura: 26 },
      { chave: "tiposConserto", titulo: "Tipos de conserto", largura: 22 },
      { chave: "pecasUtilizadas", titulo: "Peças utilizadas", largura: 22 },
      { chave: "valor", titulo: "Valor (R$)" },
      { chave: "mecanico", titulo: "Mecânico / oficina", largura: 20 },
      { chave: "observacoes", titulo: "Observações", largura: 30 },
    ],
    manutencoes.map((m) => ({
      data: formatarData(m.data),
      servicoRealizado: m.servicoRealizado,
      tiposConserto: m.tiposConserto.map((t) => TIPO_CONSERTO_LABELS[t]).join(", ") || null,
      pecasUtilizadas: m.pecasUtilizadas,
      valor: m.valor ? Number(m.valor) : null,
      mecanico: m.mecanico,
      observacoes: m.observacoes,
    })),
  );
}
