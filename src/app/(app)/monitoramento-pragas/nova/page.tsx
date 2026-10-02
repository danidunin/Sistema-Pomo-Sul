import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS } from "@/lib/pragas";
import { TipoPraga } from "@/generated/prisma/enums";
import { ehValorDoEnum } from "@/lib/enum";
import { criarLeiturasEmLote } from "@/actions/pragas";
import { GradeLeiturasForm } from "@/components/pragas/grade-leituras-form";
import { VoltarLink } from "@/components/nav/voltar-link";
import { Button } from "@/components/ui/button";

export default async function NovaLeituraPage({
  searchParams,
}: {
  searchParams: Promise<{ tipoPraga?: string; safra?: string; data?: string }>;
}) {
  const { tipoPraga, safra, data } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const pontosDisponiveis = await db.pontoMonitoramento.findMany({
    where: { propriedadeId, ativo: true },
    orderBy: [{ safra: "desc" }, { tipoPraga: "asc" }],
    select: { tipoPraga: true, safra: true },
    distinct: ["tipoPraga", "safra"],
  });

  const tipoPragaValido = tipoPraga && ehValorDoEnum(TipoPraga, tipoPraga) ? (tipoPraga as TipoPraga) : undefined;
  const safrasDaPraga = tipoPragaValido
    ? pontosDisponiveis.filter((p) => p.tipoPraga === tipoPragaValido).map((p) => p.safra)
    : [];
  const safraValida = safra && safrasDaPraga.includes(safra) ? safra : undefined;
  // A data faz parte da URL para que o servidor consiga pré-preencher a grade com
  // as leituras já registradas nessa data (a grade renavega ao trocar a data).
  const dataValida = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/monitoramento-pragas" label="Voltar" />
      <h1 className="text-xl font-semibold text-neutral-900">Nova leitura</h1>

      <form className="flex flex-wrap gap-2">
        <input type="hidden" name="data" value={dataValida} />
        <select
          name="tipoPraga"
          defaultValue={tipoPragaValido ?? ""}
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="" disabled>
            Selecione a praga...
          </option>
          {Array.from(new Set(pontosDisponiveis.map((p) => p.tipoPraga))).map((tp) => (
            <option key={tp} value={tp}>
              {TIPO_PRAGA_LABELS[tp]}
            </option>
          ))}
        </select>
        <select
          name="safra"
          defaultValue={safraValida ?? ""}
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="" disabled>
            Selecione a safra...
          </option>
          {Array.from(new Set(safrasDaPraga)).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Continuar
        </Button>
      </form>

      {tipoPragaValido && safraValida && (
        <PontosParaLancamento
          propriedadeId={propriedadeId}
          tipoPraga={tipoPragaValido}
          safra={safraValida}
          data={dataValida}
        />
      )}
    </div>
  );
}

async function PontosParaLancamento({
  propriedadeId,
  tipoPraga,
  safra,
  data,
}: {
  propriedadeId: string;
  tipoPraga: TipoPraga;
  safra: string;
  data: string;
}) {
  const pontos = await db.pontoMonitoramento.findMany({
    where: { propriedadeId, tipoPraga, safra, ativo: true },
    orderBy: { nome: "asc" },
    include: {
      armadilhas: {
        where: { ativo: true },
        orderBy: { rotulo: "asc" },
        include: { talhao: { select: { nomeCodinome: true } } },
      },
    },
  });

  // Leituras já registradas nessa data para as armadilhas exibidas: reabrir a
  // grade de uma data já lançada mostra o que está lá e permite corrigir, em vez
  // de reenviar às cegas.
  const armadilhaIds = pontos.flatMap((p) => p.armadilhas.map((a) => a.id));
  const leiturasExistentes = await db.leituraArmadilha.findMany({
    where: { armadilhaId: { in: armadilhaIds }, data: new Date(data) },
    select: { armadilhaId: true, quantidade: true },
  });
  const valoresExistentes = Object.fromEntries(leiturasExistentes.map((l) => [l.armadilhaId, l.quantidade]));

  return (
    <GradeLeiturasForm
      action={criarLeiturasEmLote}
      tipoPraga={tipoPraga}
      safra={safra}
      data={data}
      valoresExistentes={valoresExistentes}
      pontos={pontos.map((p) => ({
        id: p.id,
        nome: p.nome,
        armadilhas: p.armadilhas.map((a) => ({ id: a.id, rotulo: a.rotulo, talhaoNome: a.talhao.nomeCodinome })),
      }))}
    />
  );
}
