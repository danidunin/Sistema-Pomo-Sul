import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { buscarEstoqueConsolidado } from "@/lib/estoque";
import { VoltarLink } from "@/components/nav/voltar-link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatarQuantidade(valor: number) {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export default async function EstoqueConsolidadoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  await exigirPropriedadeAtual();

  const itens = await buscarEstoqueConsolidado({ apenasAtivos: status === "ativos" });
  const propriedadesEnvolvidas = Array.from(
    new Set(itens.flatMap((item) => item.porUnidade.flatMap((u) => u.porPropriedade.map((p) => p.propriedadeNome)))),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/estoque" label="Voltar ao estoque" />

      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Estoque consolidado</h1>
        <p className="text-sm text-neutral-500">
          {propriedadesEnvolvidas.length > 0
            ? `Soma do estoque de ${propriedadesEnvolvidas.join(" + ")}, por produto.`
            : "Soma do estoque de todas as propriedades, por produto."}
        </p>
      </div>

      <form className="flex gap-2">
        <select
          name="status"
          defaultValue={status ?? "todos"}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="todos">Todos os produtos</option>
          <option value="ativos">Só ativos</option>
        </select>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      {itens.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum produto encontrado.</p>
      ) : (
        <Card padding="none" className="overflow-hidden">
          {itens.flatMap((item) =>
            item.porUnidade.map((grupoUnidade) => (
              <div
                key={`${item.nome}-${grupoUnidade.unidade}`}
                className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {item.nome}
                    {item.porUnidade.length > 1 ? ` (${grupoUnidade.unidade})` : ""}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {grupoUnidade.porPropriedade
                      .map((p) => `${p.propriedadeNome}: ${formatarQuantidade(p.quantidadeDisponivel)} ${grupoUnidade.unidade}`)
                      .join(" · ")}
                  </p>
                </div>
                <span className="text-sm text-neutral-700">
                  {formatarQuantidade(grupoUnidade.totalDisponivel)} {grupoUnidade.unidade}
                </span>
              </div>
            )),
          )}
        </Card>
      )}
    </div>
  );
}
