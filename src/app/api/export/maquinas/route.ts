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

  const maquinas = await db.maquina.findMany({ where: { propriedadeId }, orderBy: { nome: "asc" } });

  return respostaRelatorio(
    formato,
    "maquinas",
    "Máquinas",
    [
      { chave: "nome", titulo: "Nome", largura: 24 },
      { chave: "marca", titulo: "Marca" },
      { chave: "modelo", titulo: "Modelo" },
      { chave: "ano", titulo: "Ano" },
      { chave: "horimetro", titulo: "Horímetro atual" },
      { chave: "observacoes", titulo: "Observações", largura: 30 },
    ],
    maquinas.map((m) => ({
      nome: m.nome,
      marca: m.marca,
      modelo: m.modelo,
      ano: m.ano,
      horimetro: m.horimetroAtual ? Number(m.horimetroAtual) : null,
      observacoes: m.observacoes,
    })),
  );
}
