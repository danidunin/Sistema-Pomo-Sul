import Link from "next/link";
import { db } from "@/lib/db";
import { formatarData } from "@/lib/format";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { buscarChuvaTodasPropriedades, compararChuvaPorMes, somarPeriodoComum } from "@/lib/chuva";
import { Card } from "@/components/ui/card";
import { ComparativoChuva, type PropriedadeChuva } from "@/components/chuva/comparativo-chuva";

// Cor fixa por propriedade (ordem alfabética), para não inverter quando o usuário troca de propriedade.
const CORES_PROPRIEDADE = ["bg-green-600", "bg-sky-500", "bg-amber-500", "bg-violet-500"];

function montarHref(params: { ver?: string; ano?: string }) {
  const busca = new URLSearchParams();
  if (params.ver) busca.set("ver", params.ver);
  if (params.ano) busca.set("ano", params.ano);
  const texto = busca.toString();
  return texto ? `/chuva?${texto}` : "/chuva";
}

export default async function ChuvaPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; ano?: string }>;
}) {
  const { ver, ano: anoParam } = await searchParams;
  const propriedadeId = await exigirPropriedadeAtual();
  const [propriedadesDb, leituras] = await Promise.all([
    db.propriedade.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    buscarChuvaTodasPropriedades(),
  ]);

  const propriedades: PropriedadeChuva[] = propriedadesDb.map((p, i) => {
    const primeiraLeitura = leituras.findLast((l) => l.propriedadeId === p.id)?.data ?? null;
    return {
      id: p.id,
      nome: p.nome,
      corClasse: CORES_PROPRIEDADE[i % CORES_PROPRIEDADE.length],
      ehAtual: p.id === propriedadeId,
      primeiraLeitura,
      primeiroMes: primeiraLeitura?.toISOString().slice(0, 7) ?? null,
    };
  });
  const atual = propriedades.find((p) => p.id === propriedadeId);
  const vista = propriedades.find((p) => p.id === ver) ?? atual;
  const podeEditar = vista?.id === propriedadeId;
  const leiturasVista = leituras.filter((l) => l.propriedadeId === vista?.id);

  const leiturasNumericas = leituras.map((l) => ({
    propriedadeId: l.propriedadeId,
    data: l.data,
    quantidadeMm: l.quantidadeMm.toString(),
  }));
  const comparativo = compararChuvaPorMes(leiturasNumericas);
  const anos = Array.from(new Set(comparativo.map((l) => l.mes.slice(0, 4))));
  const anoEscolhido = anoParam && anos.includes(anoParam) ? anoParam : undefined;
  const ano = anoEscolhido ?? anos[0];
  const verParam = podeEditar ? undefined : vista?.id;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Controle de Chuva</h1>
          {atual && (
            <p className="text-sm text-neutral-500">
              Novas leituras entram em <span className="font-medium text-neutral-700">{atual.nome}</span>
            </p>
          )}
        </div>
        <Link
          href="/chuva/nova"
          className="shrink-0 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Nova leitura
        </Link>
      </div>

      {ano && (
        <ComparativoChuva
          propriedades={propriedades}
          linhas={comparativo.filter((l) => l.mes.startsWith(`${ano}-`))}
          periodoComum={somarPeriodoComum(
            leiturasNumericas,
            propriedades.map((p) => p.id),
            ano,
          )}
          ano={ano}
          anos={anos}
          hrefAno={(a) => montarHref({ ver: verParam, ano: a })}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">Leituras</h2>

        {propriedades.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {propriedades.map((p) => (
              <Link
                key={p.id}
                href={montarHref({ ver: p.ehAtual ? undefined : p.id, ano: anoEscolhido })}
                scroll={false}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  p.id === vista?.id
                    ? "border-green-700 bg-green-50 text-green-800 active:bg-green-100"
                    : "border-neutral-300 text-neutral-700 active:bg-neutral-100"
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${p.corClasse}`} aria-hidden />
                {p.nome}
                {p.ehAtual && <span className="font-normal text-neutral-500">(atual)</span>}
              </Link>
            ))}
          </div>
        )}

        {vista && !podeEditar && (
          <p className="rounded-lg bg-sky-50 px-4 py-2 text-sm text-sky-800">
            Leituras registradas em {vista.nome}, apenas para consulta. Para lançar ou corrigir uma leitura dessa
            propriedade, troque de propriedade na Home.
          </p>
        )}

        {leiturasVista.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma leitura registrada ainda.</p>
        ) : (
          <Card padding="none" className="overflow-hidden">
            {leiturasVista.map((leitura) => {
              const conteudo = (
                <>
                  <p className="text-sm font-medium text-neutral-900">
                    {formatarData(leitura.data)} · {Number(leitura.quantidadeMm).toLocaleString("pt-BR")} mm
                  </p>
                  {leitura.observacoes && <p className="text-xs text-neutral-500">{leitura.observacoes}</p>}
                </>
              );
              return podeEditar ? (
                <Link
                  key={leitura.id}
                  href={`/chuva/${leitura.id}/editar`}
                  className="block border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50 active:bg-neutral-100"
                >
                  {conteudo}
                </Link>
              ) : (
                <div key={leitura.id} className="border-b border-neutral-100 px-4 py-3 last:border-b-0">
                  {conteudo}
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
