export function ExportarBotoes({ recurso, filtros }: { recurso: string; filtros?: string }) {
  const sufixo = filtros ? `&${filtros}` : "";
  return (
    <div className="flex gap-2">
      <a
        href={`/api/export/${recurso}?formato=xlsx${sufixo}`}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 active:bg-neutral-100"
      >
        Excel
      </a>
      <a
        href={`/api/export/${recurso}?formato=pdf${sufixo}`}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 active:bg-neutral-100"
      >
        PDF
      </a>
    </div>
  );
}
