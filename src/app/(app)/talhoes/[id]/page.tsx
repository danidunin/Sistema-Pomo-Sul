import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buscarHistoricoTalhao } from "@/lib/historico";
import { buscarHorasHomemTalhao } from "@/lib/atividades";
import { Timeline } from "@/components/historico/timeline";

const CAMPOS: { label: string; key: keyof NonNullable<Awaited<ReturnType<typeof buscarTalhao>>> }[] = [
  { label: "Área", key: "areaHa" },
  { label: "Cultura", key: "cultura" },
  { label: "Espécie", key: "especie" },
  { label: "Variedade", key: "variedade" },
  { label: "Porta-enxerto", key: "portaEnxerto" },
  { label: "Ano de plantio", key: "anoPlantio" },
  { label: "Espaçamento", key: "espacamento" },
  { label: "Número de plantas", key: "numeroPlantas" },
];

async function buscarTalhao(id: string) {
  return db.talhao.findUnique({ where: { id } });
}

export default async function TalhaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [talhao, historico, horasHomem] = await Promise.all([
    buscarTalhao(id),
    buscarHistoricoTalhao(id),
    buscarHorasHomemTalhao(id),
  ]);

  if (!talhao) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">{talhao.nomeCodinome}</h1>
        <Link
          href={`/talhoes/${talhao.id}/editar`}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
        >
          Editar
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {CAMPOS.map(({ label, key }) => {
          const valor = talhao[key];
          if (valor === null || valor === undefined || valor === "") return null;
          return (
            <div key={key} className="flex justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0">
              <span className="text-sm text-neutral-500">{label}</span>
              <span className="text-sm font-medium text-neutral-900">
                {key === "areaHa" ? `${valor.toString()} ha` : String(valor)}
              </span>
            </div>
          );
        })}
        {horasHomem > 0 && (
          <div className="flex justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0">
            <span className="text-sm text-neutral-500">Horas-homem acumuladas</span>
            <span className="text-sm font-medium text-neutral-900">{horasHomem}h</span>
          </div>
        )}
      </div>

      {talhao.observacoes && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="mb-1 text-sm font-medium text-neutral-700">Observações</p>
          <p className="text-sm text-neutral-600">{talhao.observacoes}</p>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-700">Histórico</h2>
        <Timeline itens={historico} />
      </div>
    </div>
  );
}
