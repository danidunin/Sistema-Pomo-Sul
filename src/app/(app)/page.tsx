import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { propriedadeAtualId } from "@/lib/propriedade";
import { definirPropriedadeAtual, esquecerPropriedadeAtual } from "@/actions/propriedade";
import { buscarResumoPropriedade, buscarResumoBasicoPropriedades } from "@/lib/dashboard";
import { buscarClima } from "@/lib/clima";
import { CulturaDot, corBarraCultura } from "@/components/ui/cultura-tag";
import { IconArea, IconParcelas, IconMaquina, IconFuncionario, IconSync } from "@/components/ui/icons";
import { PainelClima } from "@/components/clima/painel-clima";

export default async function HomePage() {
  const [session, propriedadeId] = await Promise.all([auth(), propriedadeAtualId()]);
  const primeiroNome = session?.user?.name?.split(" ")[0];

  return (
    <div className="-mx-4 -mt-4 flex flex-col gap-5 md:-mx-6">
      <section className="relative h-72 overflow-hidden md:h-96">
        <Image
          src="/images/hero-fazenda.jpg"
          alt="Vista aérea da propriedade Pomo Sul"
          fill
          priority
          className="object-cover [object-position:50%_75%]"
        />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent md:h-40" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/75 to-transparent md:h-56" />

        <Image
          src="/images/logo-pomosul-transparente.png"
          alt="Pomo Sul"
          width={1000}
          height={692}
          priority
          className="absolute left-4 top-4 h-14 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] md:left-8 md:top-6 md:h-20"
        />

        <div className="absolute inset-x-4 bottom-5 md:inset-x-8 md:bottom-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/70 md:text-xs">
            Sistema de Gestão Operacional
          </p>
          <p className="mt-1 text-2xl font-light tracking-wide text-white md:text-4xl">
            {primeiroNome ? `Bem-vindo(a) de volta, ${primeiroNome}` : "Bem-vindo(a) de volta"}
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-4 px-4 md:px-6">
        {propriedadeId ? <ResumoDaPropriedade propriedadeId={propriedadeId} /> : <SeletorPropriedade />}
      </div>
    </div>
  );
}

async function SeletorPropriedade() {
  const propriedades = await buscarResumoBasicoPropriedades();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold text-neutral-900">Escolha a propriedade</h1>
      <p className="text-sm text-neutral-500">
        Selecione em qual propriedade você quer trabalhar. Dá para trocar a qualquer momento.
      </p>

      {propriedades.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma propriedade cadastrada ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {propriedades.map((p) => (
            <form key={p.id} action={definirPropriedadeAtual.bind(null, p.id)}>
              <button
                type="submit"
                className="flex w-full flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-5 text-left active:bg-neutral-50"
              >
                <span className="text-lg font-semibold text-neutral-900">{p.nome}</span>
                <span className="text-sm text-neutral-500">
                  {p.numeroTalhoes} talhõe{p.numeroTalhoes === 1 ? "" : "s"} ·{" "}
                  {p.areaTotalHa.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha
                </span>
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

async function ResumoDaPropriedade({ propriedadeId }: { propriedadeId: string }) {
  const [propriedade, resumo, clima] = await Promise.all([
    db.propriedade.findUnique({ where: { id: propriedadeId }, select: { nome: true } }),
    buscarResumoPropriedade(propriedadeId),
    buscarClima(),
  ]);

  const maiorAreaCultura = Math.max(1, ...resumo.areaPorCultura.map((c) => c.areaHa));

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">
          {propriedade?.nome ?? "Propriedade"}
        </h1>
        <form action={esquecerPropriedadeAtual}>
          <button type="submit" className="text-sm font-medium text-green-700">
            Trocar propriedade
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cartao
          icone={<IconArea className="h-5 w-5 text-green-700" />}
          label="Área total cultivada"
          valor={`${resumo.areaTotalHa.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha`}
        />
        <Cartao
          icone={<IconParcelas className="h-5 w-5 text-green-700" />}
          label="Talhões cadastrados"
          valor={String(resumo.numeroTalhoes)}
        />
        <Cartao
          icone={<IconMaquina className="h-5 w-5 text-green-700" />}
          label="Máquinas"
          valor={String(resumo.numeroMaquinas)}
        />
        <Cartao
          icone={<IconFuncionario className="h-5 w-5 text-green-700" />}
          label="Funcionários ativos"
          valor={String(resumo.numeroFuncionarios)}
        />

        <PainelClima clima={clima} />

        <Cartao
          spanDuasColunas
          icone={<IconSync className="h-5 w-5 text-green-700" />}
          label="Última sincronização"
          valor={
            resumo.ultimaSincronizacao
              ? resumo.ultimaSincronizacao.toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
        />

        <div className="col-span-2 rounded-xl border border-neutral-200 bg-white p-4 md:col-span-4">
          <div className="mb-3 text-sm font-medium text-neutral-700">Área por cultura</div>
          {resumo.areaPorCultura.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Nenhum talhão cadastrado ainda.{" "}
              <Link href="/talhoes/novo" className="font-medium text-green-700">
                Cadastrar talhão
              </Link>
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {resumo.areaPorCultura.map((c) => (
                <div key={c.cultura} className="flex items-center gap-3">
                  <span className="flex w-24 shrink-0 items-center gap-1.5 truncate text-sm text-neutral-700">
                    <CulturaDot cultura={c.cultura} />
                    {c.cultura}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={`h-full rounded-full ${corBarraCultura(c.cultura)}`}
                      style={{ width: `${(c.areaHa / maiorAreaCultura) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm text-neutral-500">
                    {c.areaHa.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {resumo.numeroMaquinas === 0 && resumo.numeroFuncionarios === 0 && (
        <p className="text-xs text-neutral-400">
          Cadastre suas <Link href="/maquinas/novo" className="underline">máquinas</Link> e{" "}
          <Link href="/operadores/novo" className="underline">operadores</Link> para completar o painel.
        </p>
      )}
    </>
  );
}

function Cartao({
  icone,
  label,
  valor,
  spanDuasColunas,
}: {
  icone: React.ReactNode;
  label: string;
  valor: string;
  spanDuasColunas?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-4 ${
        spanDuasColunas ? "col-span-2" : ""
      }`}
    >
      {icone}
      <span className="text-lg font-semibold text-neutral-900">{valor}</span>
      <span className="text-xs text-neutral-500">{label}</span>
    </div>
  );
}
