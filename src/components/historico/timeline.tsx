import Link from "next/link";
import { formatarData } from "@/lib/format";
import type { ItemHistorico } from "@/lib/historico";

export function Timeline({ itens }: { itens: ItemHistorico[] }) {
  if (itens.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhum registro no histórico ainda.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {itens.map((item) => {
        const conteudo = (
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-neutral-900">{item.titulo}</p>
              {item.subtitulo && <p className="text-xs text-neutral-500">{item.subtitulo}</p>}
            </div>
            <span className="shrink-0 text-xs text-neutral-500">{formatarData(item.data)}</span>
          </div>
        );

        return (
          <div key={item.id} className="border-b border-neutral-100 last:border-b-0">
            {item.href ? (
              <Link href={item.href} className="block hover:bg-neutral-50">
                {conteudo}
              </Link>
            ) : (
              conteudo
            )}
          </div>
        );
      })}
    </div>
  );
}
