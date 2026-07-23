"use client";

import { useMemo, useState } from "react";
import { calcularEstimativaSafra } from "@/lib/contagem-frutos";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type Talhao = {
  id: string;
  nome: string;
  areaHa: number | null;
  numeroPlantas: number | null;
  especie: string | null;
  variedade: string | null;
};

type MetaSafra = {
  talhaoId: string;
  safra: string;
  metaFrutosPorPlanta: number;
};

export type ValoresIniciaisContagem = {
  talhaoId: string;
  safra: string;
  data: string;
  metaFrutosPorPlanta: string;
  numeroPlantasAmostradas: string;
  frutosContados: string;
  areaHa: string;
  pesoMedioFrutoG: string;
  observacoes: string;
};

type ContagemAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

const formatoNumero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const formatoKg = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function ContagemForm({
  action,
  talhoes,
  metasSafra,
  defaultValues,
  submitLabel,
}: {
  action: ContagemAction;
  talhoes: Talhao[];
  metasSafra: MetaSafra[];
  defaultValues?: Partial<ValoresIniciaisContagem>;
  submitLabel: string;
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);

  const [talhaoId, setTalhaoId] = useState(defaultValues?.talhaoId ?? "");
  const [safra, setSafra] = useState(defaultValues?.safra ?? "");
  const [metaFrutosPorPlanta, setMetaFrutosPorPlanta] = useState(defaultValues?.metaFrutosPorPlanta ?? "");
  const [numeroPlantasAmostradas, setNumeroPlantasAmostradas] = useState(
    defaultValues?.numeroPlantasAmostradas ?? "",
  );
  const [frutosContados, setFrutosContados] = useState(defaultValues?.frutosContados ?? "");
  const [areaHa, setAreaHa] = useState(defaultValues?.areaHa ?? "");
  const [pesoMedioFrutoG, setPesoMedioFrutoG] = useState(defaultValues?.pesoMedioFrutoG ?? "");

  const talhaoSelecionado = talhoes.find((t) => t.id === talhaoId);

  const metaSafraExistente = metasSafra.find((m) => m.talhaoId === talhaoId && m.safra === safra.trim());

  // Meta é única por talhão + safra: ao trocar de talhão/safra, busca automaticamente
  // o valor já definido para essa combinação, em vez de exigir digitar de novo.
  const chaveTalhaoSafra = `${talhaoId}::${safra.trim()}`;
  const [chaveMetaAnterior, setChaveMetaAnterior] = useState(chaveTalhaoSafra);
  if (chaveTalhaoSafra !== chaveMetaAnterior) {
    setChaveMetaAnterior(chaveTalhaoSafra);
    if (metaSafraExistente) {
      setMetaFrutosPorPlanta(String(metaSafraExistente.metaFrutosPorPlanta));
    }
  }

  const safrasDoTalhao = Array.from(
    new Set(metasSafra.filter((m) => m.talhaoId === talhaoId).map((m) => m.safra)),
  );

  function selecionarTalhao(id: string) {
    setTalhaoId(id);
    if (!areaHa) {
      const talhao = talhoes.find((t) => t.id === id);
      if (talhao?.areaHa) setAreaHa(String(talhao.areaHa));
    }
  }

  const plantasPorHectareCalculada =
    talhaoSelecionado?.numeroPlantas != null && talhaoSelecionado?.areaHa
      ? talhaoSelecionado.numeroPlantas / talhaoSelecionado.areaHa
      : null;

  const estimativa = useMemo(
    () =>
      calcularEstimativaSafra({
        metaFrutosPorPlanta: Number(metaFrutosPorPlanta) || 0,
        numeroPlantasAmostradas: Number(numeroPlantasAmostradas) || 0,
        frutosContados: Number(frutosContados) || 0,
        areaHa: Number(areaHa) || 0,
        plantasPorHectare: plantasPorHectareCalculada ?? 0,
        pesoMedioFrutoG: Number(pesoMedioFrutoG) || 0,
      }),
    [metaFrutosPorPlanta, numeroPlantasAmostradas, frutosContados, areaHa, plantasPorHectareCalculada, pesoMedioFrutoG],
  );

  const mostrarPreview = Boolean(
    numeroPlantasAmostradas && frutosContados && areaHa && plantasPorHectareCalculada && pesoMedioFrutoG,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="talhaoId" className="mb-1 block text-sm font-medium text-neutral-700">
            Talhão *
          </label>
          <select
            id="talhaoId"
            name="talhaoId"
            required
            value={talhaoId}
            onChange={(e) => selecionarTalhao(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            <option value="" disabled>
              Selecione...
            </option>
            {talhoes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
          {talhaoSelecionado && (talhaoSelecionado.especie || talhaoSelecionado.variedade) && (
            <p className="mt-1 text-xs text-neutral-500">
              {[talhaoSelecionado.especie, talhaoSelecionado.variedade].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="safra" className="mb-1 block text-sm font-medium text-neutral-700">
            Safra *
          </label>
          <input
            id="safra"
            name="safra"
            list="safras-do-talhao"
            required
            placeholder="ex: 2026/2027"
            value={safra}
            onChange={(e) => setSafra(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
          <datalist id="safras-do-talhao">
            {safrasDoTalhao.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label htmlFor="data" className="mb-1 block text-sm font-medium text-neutral-700">
          Data *
        </label>
        <input
          id="data"
          name="data"
          type="date"
          required
          defaultValue={defaultValues?.data ?? new Date().toISOString().slice(0, 10)}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="numeroPlantasAmostradas" className="mb-1 block text-sm font-medium text-neutral-700">
            Plantas amostradas *
          </label>
          <input
            id="numeroPlantasAmostradas"
            name="numeroPlantasAmostradas"
            type="number"
            inputMode="numeric"
            min={1}
            step="1"
            required
            value={numeroPlantasAmostradas}
            onChange={(e) => setNumeroPlantasAmostradas(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label htmlFor="frutosContados" className="mb-1 block text-sm font-medium text-neutral-700">
            Frutos contados (total) *
          </label>
          <input
            id="frutosContados"
            name="frutosContados"
            type="number"
            inputMode="numeric"
            min={0}
            step="1"
            required
            value={frutosContados}
            onChange={(e) => setFrutosContados(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
          <p className="mt-1 text-xs text-neutral-500">Soma dos frutos em todas as plantas amostradas.</p>
        </div>
      </div>

      <div>
        <label htmlFor="metaFrutosPorPlanta" className="mb-1 block text-sm font-medium text-neutral-700">
          Meta de frutos por planta *
        </label>
        <input
          id="metaFrutosPorPlanta"
          name="metaFrutosPorPlanta"
          type="number"
          inputMode="decimal"
          step="0.1"
          required
          value={metaFrutosPorPlanta}
          onChange={(e) => setMetaFrutosPorPlanta(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
        <p className="mt-1 text-xs text-neutral-500">
          {metaSafraExistente
            ? "Meta já definida para este talhão nesta safra. Se você alterar o valor, a mudança vale para todas as contagens desta safra."
            : "Nenhuma meta definida ainda para este talhão nesta safra — o valor informado será usado como meta de todas as contagens desta safra."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="areaHa" className="mb-1 block text-sm font-medium text-neutral-700">
            Área do talhão (ha) *
          </label>
          <input
            id="areaHa"
            name="areaHa"
            type="number"
            inputMode="decimal"
            step="0.01"
            required
            value={areaHa}
            onChange={(e) => setAreaHa(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Plantas por hectare</label>
          {!talhaoSelecionado ? (
            <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              Selecione um talhão
            </p>
          ) : plantasPorHectareCalculada != null ? (
            <>
              <input type="hidden" name="plantasPorHectare" value={plantasPorHectareCalculada} />
              <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-base text-neutral-700">
                {formatoNumero.format(plantasPorHectareCalculada)} plantas/ha
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Calculado do talhão: {talhaoSelecionado.numeroPlantas} plantas / {talhaoSelecionado.areaHa} ha
              </p>
            </>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Este talhão não tem número de plantas e/ou área cadastrados. Cadastre esses dados no talhão antes de
              continuar.
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="pesoMedioFrutoG" className="mb-1 block text-sm font-medium text-neutral-700">
          Peso médio do fruto (g) *
        </label>
        <input
          id="pesoMedioFrutoG"
          name="pesoMedioFrutoG"
          type="number"
          inputMode="decimal"
          step="0.1"
          required
          value={pesoMedioFrutoG}
          onChange={(e) => setPesoMedioFrutoG(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      {mostrarPreview && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-800">Estimativa</p>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-neutral-600">Média de frutos/planta</span>
            <span className="text-right font-medium text-neutral-900">
              {formatoNumero.format(estimativa.mediaFrutosPorPlanta)}
            </span>
            <span className="text-neutral-600">Número total de plantas</span>
            <span className="text-right font-medium text-neutral-900">
              {formatoNumero.format(estimativa.numeroTotalPlantas)}
            </span>
            <span className="text-neutral-600">Estimativa total de frutos</span>
            <span className="text-right font-medium text-neutral-900">
              {formatoKg.format(estimativa.estimativaTotalFrutos)}
            </span>
            <span className="text-neutral-600">Produtividade estimada</span>
            <span className="text-right font-medium text-neutral-900">
              {formatoKg.format(estimativa.produtividadeEstimadaKgHa)} kg/ha
            </span>
            <span className="text-neutral-600">Estimativa de safra do talhão</span>
            <span className="text-right font-semibold text-green-800">
              {formatoKg.format(estimativa.estimativaSafraKg)} kg
            </span>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="observacoes" className="mb-1 block text-sm font-medium text-neutral-700">
          Observações
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          defaultValue={defaultValues?.observacoes}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      {erro}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-green-700 py-3 text-base font-medium text-white active:bg-green-800 disabled:opacity-60"
      >
        {rotulo(submitLabel)}
      </button>
    </form>
  );
}
