import Link from "next/link";
import { db } from "@/lib/db";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { ExportarBotoes } from "@/components/relatorios/exportar-botoes";
import { CulturaTag } from "@/components/ui/cultura-tag";

export default async function TalhoesPage() {
  const propriedadeId = await exigirPropriedadeAtual();
  const talhoes = await db.talhao.findMany({ where: { propriedadeId }, orderBy: { nomeCodinome: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Talhões</h1>
        <Link
          href="/talhoes/novo"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Novo talhão
        </Link>
      </div>

      <ExportarBotoes recurso="talhoes" />

      {talhoes.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum talhão cadastrado ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {talhoes.map((talhao) => (
            <Link
              key={talhao.id}
              href={`/talhoes/${talhao.id}`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{talhao.nomeCodinome}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <CulturaTag cultura={talhao.especie} />
                  {talhao.variedade && <span className="text-xs text-neutral-500">{talhao.variedade}</span>}
                  {!talhao.especie && !talhao.variedade && (
                    <span className="text-xs text-neutral-500">Sem detalhes cadastrados</span>
                  )}
                </div>
              </div>
              {talhao.areaHa && (
                <span className="text-xs text-neutral-500">{talhao.areaHa.toString()} ha</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
