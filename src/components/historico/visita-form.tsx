"use client";

import { criarVisitaCampo, atualizarVisitaCampo } from "@/actions/visitas";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";
import { MultiFotoInput } from "@/components/upload/multi-foto-input";

const OPCOES_ENFOLHAMENTO = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export type ValoresIniciaisVisita = {
  talhaoId: string;
  data: string;
  temperatura: string;
  percentualEnfolhamento: string;
  observacoes: string;
};

export function VisitaForm({
  talhoes,
  talhaoIdInicial,
  modo = "criar",
  visitaId,
  valoresIniciais,
}: {
  talhoes: { id: string; nome: string }[];
  talhaoIdInicial?: string;
  modo?: "criar" | "editar";
  visitaId?: string;
  valoresIniciais?: ValoresIniciaisVisita;
}) {
  const action = modo === "editar" ? atualizarVisitaCampo.bind(null, visitaId!) : criarVisitaCampo;
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);

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
            defaultValue={valoresIniciais?.talhaoId ?? talhaoIdInicial ?? ""}
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
            defaultValue={valoresIniciais?.data ?? new Date().toISOString().slice(0, 10)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="temperatura" className="mb-1 block text-sm font-medium text-neutral-700">
            Temperatura (°C)
          </label>
          <input
            id="temperatura"
            name="temperatura"
            type="number"
            inputMode="decimal"
            step="0.1"
            defaultValue={valoresIniciais?.temperatura ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label htmlFor="percentualEnfolhamento" className="mb-1 block text-sm font-medium text-neutral-700">
            Enfolhamento
          </label>
          <select
            id="percentualEnfolhamento"
            name="percentualEnfolhamento"
            defaultValue={valoresIniciais?.percentualEnfolhamento ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            <option value="">Não informado</option>
            {OPCOES_ENFOLHAMENTO.map((valor) => (
              <option key={valor} value={valor}>
                {valor}%
              </option>
            ))}
          </select>
        </div>
      </div>

      {modo === "criar" && <MultiFotoInput name="fotos" pasta="visitas" label="Fotos" />}

      <div>
        <label htmlFor="observacoes" className="mb-1 block text-sm font-medium text-neutral-700">
          Observações
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          defaultValue={valoresIniciais?.observacoes ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      {erro}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-green-700 py-3 text-base font-medium text-white active:bg-green-800 disabled:opacity-60"
      >
        {rotulo(modo === "editar" ? "Salvar alterações" : "Registrar visita")}
      </button>
    </form>
  );
}
