"use client";

import { useRef, useState } from "react";

const NOMES_MES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Filtro de período do Histórico do Pomar: escolhe o ano, depois o mês numa grade — sem lista longa para rolar. */
export function PeriodoPicker({ valorInicial }: { valorInicial?: string }) {
  const anoInicial = valorInicial ? Number(valorInicial.split("-")[0]) : undefined;
  const [valor, setValor] = useState(valorInicial ?? "");
  const [anoVisivel, setAnoVisivel] = useState(anoInicial ?? new Date().getFullYear());
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function escolherMes(mes: number) {
    setValor(`${anoVisivel}-${String(mes).padStart(2, "0")}`);
    if (detailsRef.current) detailsRef.current.open = false;
  }

  function limpar() {
    setValor("");
    if (detailsRef.current) detailsRef.current.open = false;
  }

  const label = valor ? `${NOMES_MES[Number(valor.split("-")[1]) - 1]} de ${valor.split("-")[0]}` : "Todos os períodos";

  return (
    <details ref={detailsRef} className="relative flex-1">
      <input type="hidden" name="mesAno" value={valor} />
      <summary
        className="cursor-pointer list-none rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
      >
        {label}
      </summary>

      <div className="absolute z-10 mt-2 w-72 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setAnoVisivel((a) => a - 1)}
            className="rounded-lg px-3 py-1 text-lg text-neutral-500 hover:bg-neutral-100"
            aria-label="Ano anterior"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-neutral-900">{anoVisivel}</span>
          <button
            type="button"
            onClick={() => setAnoVisivel((a) => a + 1)}
            className="rounded-lg px-3 py-1 text-lg text-neutral-500 hover:bg-neutral-100"
            aria-label="Próximo ano"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {MESES_ABREV.map((nome, i) => {
            const mes = i + 1;
            const selecionado = valor === `${anoVisivel}-${String(mes).padStart(2, "0")}`;
            return (
              <button
                key={nome}
                type="button"
                onClick={() => escolherMes(mes)}
                className={`rounded-lg px-2 py-2 text-sm font-medium ${
                  selecionado ? "bg-green-700 text-white" : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {nome}
              </button>
            );
          })}
        </div>

        {valor && (
          <button
            type="button"
            onClick={limpar}
            className="mt-3 w-full rounded-lg border border-neutral-200 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50"
          >
            Limpar filtro de período
          </button>
        )}
      </div>
    </details>
  );
}
