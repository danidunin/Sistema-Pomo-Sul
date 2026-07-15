import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { OperacaoForm } from "@/components/operacoes/operacao-form";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function EditarOperacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propriedadeId = await exigirPropriedadeAtual();

  const operacao = await db.operacaoAgricola.findUnique({
    where: { id },
    include: { talhao: true, produtos: true },
  });

  if (!operacao || operacao.talhao.propriedadeId !== propriedadeId) notFound();

  const [talhoes, produtos, operadores, maquinas] = await Promise.all([
    db.talhao.findMany({
      where: { propriedadeId },
      orderBy: { nomeCodinome: "asc" },
      select: { id: true, nomeCodinome: true, areaHa: true },
    }),
    db.produto.findMany({
      // Inclui produtos já inativos se este tratamento os usa, para não somem do
      // formulário de edição — só esconde inativos que não têm nenhuma relação aqui.
      where: {
        propriedadeId,
        OR: [{ ativo: true }, { id: { in: operacao.produtos.map((p) => p.produtoId) } }],
      },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, unidade: true, unidadeDosagem: true },
    }),
    db.operador.findMany({
      where: { propriedadeId, ativo: true },
      orderBy: { nomeCompleto: "asc" },
      select: { id: true, nomeCompleto: true },
    }),
    db.maquina.findMany({ where: { propriedadeId }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={`/tratamentos/${operacao.id}`} label="Voltar ao tratamento" />
      <h1 className="text-xl font-semibold text-neutral-900">Editar tratamento</h1>
      <OperacaoForm
        modo="editar"
        operacaoId={operacao.id}
        talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nomeCodinome, areaHa: t.areaHa ? Number(t.areaHa) : null }))}
        produtos={produtos}
        operadores={operadores.map((o) => ({ id: o.id, nome: o.nomeCompleto }))}
        maquinas={maquinas}
        valoresIniciais={{
          tipo: operacao.tipo,
          data: operacao.data.toISOString().slice(0, 10),
          talhaoId: operacao.talhaoId,
          volumeCalda: operacao.volumeCalda?.toString() ?? "",
          operadorId: operacao.operadorId ?? "",
          maquinaId: operacao.maquinaId ?? "",
          numeroPessoas: operacao.numeroPessoas?.toString() ?? "",
          horasPorPessoa: operacao.horasPorPessoa?.toString() ?? "",
          horasMaquina: operacao.horasMaquina?.toString() ?? "",
          observacoes: operacao.observacoes ?? "",
          produtos: operacao.produtos.map((p) => ({
            produtoId: p.produtoId,
            concentracao: p.concentracao?.toString() ?? "",
          })),
        }}
      />
    </div>
  );
}
