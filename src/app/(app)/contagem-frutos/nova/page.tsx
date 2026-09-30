import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ContagemForm } from "@/components/contagem-frutos/contagem-form";
import { criarContagemFrutos } from "@/actions/contagem-frutos";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function NovaContagemPage({
  searchParams,
}: {
  searchParams: Promise<{ talhaoId?: string; safra?: string }>;
}) {
  const { talhaoId, safra } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();
  const [talhoes, metasSafra] = await Promise.all([
    db.talhao.findMany({
      where: { propriedadeId },
      orderBy: { nomeCodinome: "asc" },
      select: { id: true, nomeCodinome: true, areaHa: true, numeroPlantas: true, especie: true, variedade: true },
    }),
    db.metaSafra.findMany({
      where: { talhao: { propriedadeId } },
      select: { talhaoId: true, safra: true, metaFrutosPorPlanta: true },
    }),
  ]);

  // Quando a contagem é aberta a partir da tela de detalhe da quadra, talhaoId e
  // safra já chegam preenchidos via query string — nesse caso, a meta já definida
  // para essa combinação (se existir) precisa vir pré-preenchida no formulário,
  // já que o ContagemForm só busca a meta automaticamente quando a combinação
  // talhão+safra muda após a montagem do formulário.
  const metaSafraCorrespondente =
    talhaoId && safra ? metasSafra.find((m) => m.talhaoId === talhaoId && m.safra === safra) : undefined;

  const voltarHref =
    talhaoId && safra ? `/contagem-frutos/quadra/${talhaoId}?safra=${encodeURIComponent(safra)}` : "/contagem-frutos";

  if (talhoes.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <VoltarLink href={voltarHref} label="Voltar" />
        <h1 className="text-xl font-semibold text-neutral-900">Nova contagem de frutos</h1>
        <p className="text-sm text-neutral-500">Cadastre um talhão antes de registrar uma contagem.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href={voltarHref} label="Voltar" />
      <h1 className="text-xl font-semibold text-neutral-900">Nova contagem de frutos</h1>
      <ContagemForm
        action={criarContagemFrutos}
        talhoes={talhoes.map((t) => ({
          id: t.id,
          nome: t.nomeCodinome,
          areaHa: t.areaHa ? Number(t.areaHa) : null,
          numeroPlantas: t.numeroPlantas,
          especie: t.especie,
          variedade: t.variedade,
        }))}
        metasSafra={metasSafra.map((m) => ({
          talhaoId: m.talhaoId,
          safra: m.safra,
          metaFrutosPorPlanta: Number(m.metaFrutosPorPlanta),
        }))}
        defaultValues={
          talhaoId || safra
            ? {
                talhaoId,
                safra,
                ...(metaSafraCorrespondente
                  ? { metaFrutosPorPlanta: String(Number(metaSafraCorrespondente.metaFrutosPorPlanta)) }
                  : {}),
              }
            : undefined
        }
        submitLabel="Registrar contagem"
      />
    </div>
  );
}
