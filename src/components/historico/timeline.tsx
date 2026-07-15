import Link from "next/link";
import { formatarData } from "@/lib/format";
import { iconeItemHistorico, type ItemHistorico } from "@/lib/historico";
import { FotoMiniatura } from "@/components/upload/foto-miniatura";

export function Timeline({ itens, mostrarTalhao = false }: { itens: ItemHistorico[]; mostrarTalhao?: boolean }) {
  if (itens.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhum registro no histórico ainda.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {itens.map((item) => {
        const conteudo = (
          <div className="flex items-start gap-3 px-4 py-3">
            <span className="text-lg leading-none">{iconeItemHistorico(item.tipo)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-neutral-900">
                  {item.titulo}
                  {mostrarTalhao && item.talhaoNome && (
                    <span className="ml-2 text-xs font-normal text-neutral-500">{item.talhaoNome}</span>
                  )}
                </p>
                <span className="shrink-0 text-xs text-neutral-500">{formatarData(item.data)}</span>
              </div>
              {item.subtitulo && <p className="text-xs text-neutral-500">{item.subtitulo}</p>}
              {item.fotos && item.fotos.length > 0 && (
                <div className="mt-2 flex gap-1.5">
                  {item.fotos.map((url) => (
                    <FotoMiniatura key={url} url={url} className="h-12 w-12" />
                  ))}
                </div>
              )}
            </div>
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
