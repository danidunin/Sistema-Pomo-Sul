const CORES_CULTURA = {
  maca: { dot: "bg-maca", bg: "bg-maca-soft", texto: "text-maca" },
  ameixa: { dot: "bg-ameixa", bg: "bg-ameixa-soft", texto: "text-ameixa" },
  pessego: { dot: "bg-pessego", bg: "bg-pessego-soft", texto: "text-pessego" },
} as const;

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function corDaCultura(cultura: string | null | undefined) {
  if (!cultura) return null;
  const chave = normalizar(cultura);
  if (chave.includes("maca")) return CORES_CULTURA.maca;
  if (chave.includes("ameixa")) return CORES_CULTURA.ameixa;
  if (chave.includes("pessego")) return CORES_CULTURA.pessego;
  return null;
}

/** Classe de cor de fundo (bg-*) para a cultura — para barras de gráfico e outros usos fora de tag/dot prontos. */
export function corBarraCultura(cultura: string): string {
  return corDaCultura(cultura)?.dot ?? "bg-green-600";
}

/** Bolinha colorida por cultura (maçã/ameixa/pêssego) — para usar ao lado do nome do talhão em listas. */
export function CulturaDot({ cultura }: { cultura: string | null | undefined }) {
  const cor = corDaCultura(cultura);
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cor?.dot ?? "bg-neutral-300"}`} />;
}

/** Etiqueta com bolinha + nome da cultura — para listas e cabeçalhos. */
export function CulturaTag({ cultura }: { cultura: string | null | undefined }) {
  if (!cultura) return null;
  const cor = corDaCultura(cultura);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        cor ? `${cor.bg} ${cor.texto}` : "bg-neutral-100 text-neutral-500"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cor?.dot ?? "bg-neutral-400"}`} />
      {cultura}
    </span>
  );
}
