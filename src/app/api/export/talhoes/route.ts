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

  const talhoes = await db.talhao.findMany({ where: { propriedadeId }, orderBy: { nomeCodinome: "asc" } });

  return respostaRelatorio(
    formato,
    "talhoes",
    "Talhões",
    [
      { chave: "nome", titulo: "Nome/codinome", largura: 24 },
      { chave: "area", titulo: "Área (ha)" },
      { chave: "especie", titulo: "Espécie" },
      { chave: "variedade", titulo: "Variedade" },
      { chave: "portaEnxerto", titulo: "Porta-enxerto" },
      { chave: "anoPlantio", titulo: "Ano de plantio" },
      { chave: "espacamento", titulo: "Espaçamento" },
      { chave: "numeroPlantas", titulo: "Nº de plantas" },
    ],
    talhoes.map((t) => ({
      nome: t.nomeCodinome,
      area: t.areaHa ? Number(t.areaHa) : null,
      especie: t.especie,
      variedade: t.variedade,
      portaEnxerto: t.portaEnxerto,
      anoPlantio: t.anoPlantio,
      espacamento: t.espacamento,
      numeroPlantas: t.numeroPlantas,
    })),
  );
}
