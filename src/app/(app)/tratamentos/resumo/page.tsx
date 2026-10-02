import Link from "next/link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { VoltarLink } from "@/components/nav/voltar-link";
import { cicloAtual } from "@/lib/ciclo";
import {
  buscarContagensChaveParaFormulario,
  ordenarCiclosDesc,
  statusCelula,
  type StatusCelula,
} from "@/lib/limite-aplicacoes";
import { Card } from "@/components/ui/card";

const CORES_STATUS: Record<StatusCelula, string> = {
  SEM_APLICACAO: "bg-neutral-100 text-neutral-500",
  DENTRO_LIMITE: "bg-green-100 text-green-700",
  NO_LIMITE: "bg-amber-100 text-amber-700",
  ACIMA_LIMITE: "bg-red-100 text-red-700",
};

export default async function ResumoCicloPage({
  searchParams,
}: {
  searchParams: Promise<{ ciclo?: string }>;
}) {
  const { ciclo: cicloParam } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();

  const [talhoes, produtosChave, contagens] = await Promise.all([
    db.talhao.findMany({
      where: { propriedadeId },
      orderBy: { nomeCodinome: "asc" },
      select: { id: true, nomeCodinome: true },
    }),
    db.produto.findMany({
      where: { propriedadeId, ativo: true, limiteAplicacoesCiclo: { not: null } },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, limiteAplicacoesCiclo: true },
    }),
    buscarContagensChaveParaFormulario(propriedadeId),
  ]);

  const cicloAtualLabel = cicloAtual().label;
  const labelsComDados = contagens.flatMap((contagem) =>
    Object.values(contagem.porTalhaoECiclo).flatMap((porCiclo) => Object.keys(porCiclo)),
  );
  const ciclosDisponiveis = ordenarCiclosDesc([cicloAtualLabel, ...labelsComDados]);
  const cicloSelecionado =
    cicloParam && ciclosDisponiveis.includes(cicloParam) ? cicloParam : cicloAtualLabel;

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/tratamentos" label="Voltar aos tratamentos" />
      <h1 className="text-xl font-semibold text-neutral-900">Resumo do ciclo</h1>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {ciclosDisponiveis.map((label) => (
          <Link
            key={label}
            href={`/tratamentos/resumo?ciclo=${label}`}
            className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium ${
              cicloSelecionado === label
                ? "border-green-700 bg-green-700 text-white"
                : "border-neutral-300 bg-white text-neutral-700"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {produtosChave.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum produto com limite de aplicações cadastrado. Defina em Estoque → editar
          produto.
        </p>
      ) : talhoes.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma quadra cadastrada ainda.</p>
      ) : (
        <Card padding="none" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
                <th className="px-4 py-2 font-normal">Quadra</th>
                {produtosChave.map((produto) => (
                  <th key={produto.id} className="px-4 py-2 font-normal">
                    {produto.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {talhoes.map((talhao) => (
                <tr key={talhao.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2 font-medium text-neutral-900">{talhao.nomeCodinome}</td>
                  {produtosChave.map((produto) => {
                    const contagemProduto = contagens.find((c) => c.produtoId === produto.id);
                    const contagem = contagemProduto?.porTalhaoECiclo[talhao.id]?.[cicloSelecionado] ?? 0;
                    const limite = produto.limiteAplicacoesCiclo!;
                    const status = statusCelula(contagem, limite);
                    return (
                      <td key={produto.id} className="px-4 py-2">
                        <span
                          className={`inline-block rounded px-2 py-1 text-xs font-medium ${CORES_STATUS[status]}`}
                        >
                          {contagem}/{limite}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
