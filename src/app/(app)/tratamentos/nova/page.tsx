import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { OperacaoForm } from "@/components/operacoes/operacao-form";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaOperacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ talhaoId?: string }>;
}) {
  const { talhaoId } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();
  const [talhoes, produtos, operadores, maquinas] = await Promise.all([
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
      <h1 className="text-xl font-semibold text-neutral-900">Novo tratamento fitossanitário</h1>
      <OperacaoForm
        talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nomeCodinome, areaHa: t.areaHa ? Number(t.areaHa) : null }))}
        produtos={produtos}
        operadores={operadores.map((o) => ({ id: o.id, nome: o.nomeCompleto }))}
        maquinas={maquinas}
        talhaoIdInicial={talhoes.some((t) => t.id === talhaoId) ? talhaoId : undefined}
      />
    </div>
  );
}
