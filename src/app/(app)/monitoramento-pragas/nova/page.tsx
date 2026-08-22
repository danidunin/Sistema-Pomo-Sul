import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { TIPO_PRAGA_LABELS } from "@/lib/pragas";
import { TipoPraga } from "@/generated/prisma/enums";
import { ehValorDoEnum } from "@/lib/enum";
import { criarLeiturasEmLote } from "@/actions/pragas";
import { GradeLeiturasForm } from "@/components/pragas/grade-leituras-form";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaLeituraPage({
  searchParams,
}: {
  searchParams: Promise<{ tipoPraga?: string; safra?: string }>;
}) {
  const { tipoPraga, safra } = await searchParams;
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

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/monitoramento-pragas" label="Voltar" />
      <h1 className="text-xl font-semibold text-neutral-900">Nova leitura</h1>

      <form className="flex flex-wrap gap-2">
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
        <button type="submit" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700">
          Continuar
        </button>
      </form>

      {tipoPragaValido && safraValida && (
        <PontosParaLancamento propriedadeId={propriedadeId} tipoPraga={tipoPragaValido} safra={safraValida} />
      )}
    </div>
  );
}

async function PontosParaLancamento({
  propriedadeId,
  tipoPraga,
  safra,
}: {
  propriedadeId: string;
  tipoPraga: TipoPraga;
  safra: string;
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

  return (
    <GradeLeiturasForm
      action={criarLeiturasEmLote}
      tipoPraga={tipoPraga}
      safra={safra}
      pontos={pontos.map((p) => ({
        id: p.id,
        nome: p.nome,
        armadilhas: p.armadilhas.map((a) => ({ id: a.id, rotulo: a.rotulo, talhaoNome: a.talhao.nomeCodinome })),
      }))}
    />
  );
}
