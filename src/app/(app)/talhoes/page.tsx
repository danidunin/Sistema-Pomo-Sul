import Link from "next/link";
import { db } from "@/lib/db";

export default async function TalhoesPage() {
  const talhoes = await db.talhao.findMany({ orderBy: { nomeCodinome: "asc" } });

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
                <p className="text-xs text-neutral-500">
                  {[talhao.cultura, talhao.especie, talhao.variedade].filter(Boolean).join(" · ") ||
                    "Sem detalhes cadastrados"}
                </p>
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
