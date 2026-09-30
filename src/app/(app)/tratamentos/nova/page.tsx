import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { OperacaoForm } from "@/components/operacoes/operacao-form";
import { VoltarLink } from "@/components/nav/voltar-link";
import { buscarContagensChaveParaFormulario } from "@/lib/limite-aplicacoes";
import { buscarCandidatosMesmaAplicacao } from "@/lib/candidatos-mesma-aplicacao";

export default async function NovaOperacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ talhaoId?: string }>;
}) {
  const { talhaoId } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();
  const [talhoes, produtos, operadores, maquinas, contagensChave, candidatosMesmaAplicacao] = await Promise.all([
    db.talhao.findMany({
      where: { propriedadeId },
      orderBy: { nomeCodinome: "asc" },
      select: { id: true, nomeCodinome: true, areaHa: true },
    }),
    db.produto.findMany({
      where: { propriedadeId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, unidade: true, unidadeDosagem: true },
    }),
    db.operador.findMany({
      where: { propriedadeId, ativo: true },
      orderBy: { nomeCompleto: "asc" },
      select: { id: true, nomeCompleto: true },
    }),
    db.maquina.findMany({
      where: { propriedadeId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    buscarContagensChaveParaFormulario(propriedadeId),
    buscarCandidatosMesmaAplicacao(propriedadeId),
  ]);

  if (talhoes.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <VoltarLink href="/tratamentos" label="Voltar aos tratamentos" />
        <h1 className="text-xl font-semibold text-neutral-900">Novo tratamento</h1>
        <p className="text-sm text-neutral-500">Cadastre um talhão antes de registrar um tratamento.</p>
      </div>
    );
  }

  if (produtos.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <VoltarLink href="/tratamentos" label="Voltar aos tratamentos" />
        <h1 className="text-xl font-semibold text-neutral-900">Novo tratamento</h1>
        <p className="text-sm text-neutral-500">Cadastre um produto no estoque antes de registrar um tratamento.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/tratamentos" label="Voltar aos tratamentos" />
      {/* Título genérico: o formulário atende fitossanitário, herbicida, adubação e outras. */}
      <h1 className="text-xl font-semibold text-neutral-900">Novo tratamento</h1>
      <OperacaoForm
        talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nomeCodinome, areaHa: t.areaHa ? Number(t.areaHa) : null }))}
        produtos={produtos}
        operadores={operadores.map((o) => ({ id: o.id, nome: o.nomeCompleto }))}
        maquinas={maquinas}
        contagensChave={contagensChave}
        candidatosMesmaAplicacao={candidatosMesmaAplicacao}
        talhaoIdInicial={talhoes.some((t) => t.id === talhaoId) ? talhaoId : undefined}
      />
    </div>
  );
}
