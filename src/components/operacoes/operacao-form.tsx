"use client";

import { useState } from "react";
import { criarOperacao, atualizarOperacao } from "@/actions/operacoes";
import { criarOperadorRapido } from "@/actions/operadores";
import { criarMaquinaRapido } from "@/actions/maquinas";
import { calcularQuantidade, unidadeCanonica, converterParaUnidadeEstoque, UNIDADE_DOSAGEM_LABELS } from "@/lib/concentracao";
import type { UnidadeDosagem } from "@/generated/prisma/enums";
import { AdicionarRapido } from "@/components/operacoes/adicionar-rapido";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";

type Opcao = { id: string; nome: string };
type TalhaoOpcao = { id: string; nome: string; areaHa: number | null };
type ProdutoOpcao = { id: string; nome: string; unidade: string; unidadeDosagem: UnidadeDosagem | null };
type ProdutoLancado = { produtoId: string; concentracao: string };

export type ValoresIniciaisOperacao = {
  tipo: string;
  data: string;
  talhaoId: string;
  volumeCalda: string;
  operadorId: string;
  maquinaId: string;
  numeroPessoas: string;
  horasPorPessoa: string;
  horasMaquina: string;
  observacoes: string;
  produtos: ProdutoLancado[];
};

const TIPOS = [
  { value: "FITOSSANITARIO", label: "Tratamento fitossanitário" },
  { value: "HERBICIDA", label: "Herbicida" },
  { value: "ADUBACAO", label: "Adubação" },
  { value: "OUTRA", label: "Outra" },
];

let proximaChave = 0;

type LinhaState = { chave: number; valorInicial?: ProdutoLancado };

export function OperacaoForm({
  talhoes,
  produtos,
  operadores,
  maquinas,
  talhaoIdInicial,
  modo = "criar",
  operacaoId,
  valoresIniciais,
}: {
  talhoes: TalhaoOpcao[];
  produtos: ProdutoOpcao[];
  operadores: Opcao[];
  maquinas: Opcao[];
  talhaoIdInicial?: string;
  modo?: "criar" | "editar";
  operacaoId?: string;
  valoresIniciais?: ValoresIniciaisOperacao;
}) {
  const action = modo === "editar" ? atualizarOperacao.bind(null, operacaoId!) : criarOperacao;
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);
  const [tipo, setTipo] = useState(valoresIniciais?.tipo ?? "FITOSSANITARIO");
  const [talhaoId, setTalhaoId] = useState(valoresIniciais?.talhaoId ?? talhaoIdInicial ?? "");
  const [volumeCalda, setVolumeCalda] = useState(valoresIniciais?.volumeCalda ?? "");
  const [operadoresLista, setOperadoresLista] = useState(operadores);
  const [operadorId, setOperadorId] = useState(valoresIniciais?.operadorId ?? "");
  const [maquinasLista, setMaquinasLista] = useState(maquinas);
  const [maquinaId, setMaquinaId] = useState(valoresIniciais?.maquinaId ?? "");
  const [numeroPessoas, setNumeroPessoas] = useState(valoresIniciais?.numeroPessoas ?? "");
  const [horasPorPessoa, setHorasPorPessoa] = useState(valoresIniciais?.horasPorPessoa ?? "");
  const [linhas, setLinhas] = useState<LinhaState[]>(() =>
    valoresIniciais?.produtos.length
      ? valoresIniciais.produtos.map((p) => ({ chave: proximaChave++, valorInicial: p }))
      : [{ chave: proximaChave++ }],
  );

  const areaHa = talhoes.find((t) => t.id === talhaoId)?.areaHa ?? null;
  const horasHomem =
    numeroPessoas && horasPorPessoa ? Number(numeroPessoas) * Number(horasPorPessoa) : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="tipo" className="mb-1 block text-sm font-medium text-neutral-700">
            Tipo de operação *
          </label>
          <select
            id="tipo"
            name="tipo"
            required
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
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

      <div>
        <label htmlFor="talhaoId" className="mb-1 block text-sm font-medium text-neutral-700">
          Talhão *
        </label>
        <select
          id="talhaoId"
          name="talhaoId"
          required
          value={talhaoId}
          onChange={(e) => setTalhaoId(e.target.value)}
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
        <label htmlFor="volumeCalda" className="mb-1 block text-sm font-medium text-neutral-700">
          Volume de calda (L)
        </label>
        <input
          id="volumeCalda"
          name="volumeCalda"
          type="number"
          inputMode="decimal"
          step="0.01"
          value={volumeCalda}
          onChange={(e) => setVolumeCalda(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Necessário se algum produto usado tiver dosagem por % ou por 100L (a maioria dos casos).
        </p>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700">Produtos *</span>
          <button
            type="button"
            onClick={() => setLinhas((atual) => [...atual, { chave: proximaChave++ }])}
            className="text-sm font-medium text-green-700"
          >
            + Adicionar produto
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {linhas.map((linha) => (
            <LinhaProduto
              key={linha.chave}
              produtos={produtos}
              volumeCalda={volumeCalda ? Number(volumeCalda) : null}
              areaHa={areaHa}
              valorInicial={linha.valorInicial}
              onRemover={
                linhas.length > 1
                  ? () => setLinhas((atual) => atual.filter((l) => l.chave !== linha.chave))
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="operadorId" className="mb-1 block text-sm font-medium text-neutral-700">
            Operador
          </label>
          <select
            id="operadorId"
            name="operadorId"
            value={operadorId}
            onChange={(e) => setOperadorId(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            <option value="">Não informado</option>
            {operadoresLista.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
          <AdicionarRapido
            label="Novo operador"
            action={criarOperadorRapido}
            onCriado={(novo) => {
              setOperadoresLista((atual) => [...atual, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
              setOperadorId(novo.id);
            }}
          />
        </div>
        <div>
          <label htmlFor="maquinaId" className="mb-1 block text-sm font-medium text-neutral-700">
            Máquina utilizada
          </label>
          <select
            id="maquinaId"
            name="maquinaId"
            value={maquinaId}
            onChange={(e) => setMaquinaId(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            <option value="">Nenhuma</option>
            {maquinasLista.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          <AdicionarRapido
            label="Nova máquina"
            action={criarMaquinaRapido}
            onCriado={(novo) => {
              setMaquinasLista((atual) => [...atual, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
              setMaquinaId(novo.id);
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="numeroPessoas" className="mb-1 block text-sm font-medium text-neutral-700">
            Quantidade de pessoas *
          </label>
          <input
            id="numeroPessoas"
            name="numeroPessoas"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            required
            value={numeroPessoas}
            onChange={(e) => setNumeroPessoas(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <label htmlFor="horasPorPessoa" className="mb-1 block text-sm font-medium text-neutral-700">
            Horas por pessoa *
          </label>
          <input
            id="horasPorPessoa"
            name="horasPorPessoa"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            required
            value={horasPorPessoa}
            onChange={(e) => setHorasPorPessoa(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      </div>

      {horasHomem !== null && (
        <p className="-mt-2 text-xs text-neutral-500">
          = {horasHomem.toLocaleString("pt-BR")} horas-homem
        </p>
      )}

      <div>
        <label htmlFor="horasMaquina" className="mb-1 block text-sm font-medium text-neutral-700">
          Horas de máquina *
        </label>
        <input
          id="horasMaquina"
          name="horasMaquina"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.5"
          required
          defaultValue={valoresIniciais?.horasMaquina ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

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
        {rotulo(modo === "editar" ? "Salvar alterações" : "Registrar operação")}
      </button>
    </form>
  );
}

function LinhaProduto({
  produtos,
  volumeCalda,
  areaHa,
  onRemover,
  valorInicial,
}: {
  produtos: ProdutoOpcao[];
  volumeCalda: number | null;
  areaHa: number | null;
  onRemover?: () => void;
  valorInicial?: ProdutoLancado;
}) {
  const [produtoId, setProdutoId] = useState(valorInicial?.produtoId ?? "");
  const [concentracao, setConcentracao] = useState(valorInicial?.concentracao ?? "");
  const produto = produtos.find((p) => p.id === produtoId);

  const quantidadeCalculada =
    produto?.unidadeDosagem && concentracao
      ? calcularQuantidade({
          concentracao: Number(concentracao),
          unidadeDosagem: produto.unidadeDosagem,
          volumeCalda,
          areaHa,
        })
      : null;

  const quantidade =
    produto?.unidadeDosagem && quantidadeCalculada !== null
      ? converterParaUnidadeEstoque(quantidadeCalculada, unidadeCanonica(produto.unidadeDosagem), produto.unidade)
      : null;

  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <select
            name="produtoId[]"
            required
            value={produtoId}
            onChange={(e) => setProdutoId(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            <option value="" disabled>
              Selecione o produto...
            </option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.unidadeDosagem}>
                {p.nome}
                {!p.unidadeDosagem ? " (sem dosagem cadastrada)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <input
            name="concentracao[]"
            type="number"
            inputMode="decimal"
            step="0.001"
            required
            value={concentracao}
            onChange={(e) => setConcentracao(e.target.value)}
            placeholder={produto?.unidadeDosagem ? UNIDADE_DOSAGEM_LABELS[produto.unidadeDosagem] : "Concentração"}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        {onRemover && (
          <button
            type="button"
            onClick={onRemover}
            className="rounded-lg border border-neutral-300 px-3 py-3 text-sm text-neutral-500"
            aria-label="Remover produto"
          >
            ✕
          </button>
        )}
      </div>

      {produto?.unidadeDosagem && (
        <p className="mt-1 text-xs text-neutral-500">
          {concentracao ? `${concentracao} ${UNIDADE_DOSAGEM_LABELS[produto.unidadeDosagem]}` : "Informe a concentração"}
          {quantidade !== null && ` → ${quantidade.toLocaleString("pt-BR")} ${produto.unidade}`}
          {quantidade === null && concentracao && " → informe volume de calda/área para calcular"}
        </p>
      )}
    </div>
  );
}
