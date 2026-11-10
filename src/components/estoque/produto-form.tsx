"use client";

import { useMemo, useState } from "react";
import { UNIDADE_DOSAGEM_LABELS } from "@/lib/concentracao";
import {
  UNIDADES_ESTOQUE,
  buscarParecidos,
  chaveNomeProduto,
  mesmoProduto,
  unidadeDaLista,
  type ProdutoExistente,
} from "@/lib/produto-nome";
import { useFormularioAcao } from "@/hooks/use-formulario-acao";
import { Button } from "@/components/ui/button";

type ProdutoFormValues = {
  nome: string;
  unidade: string;
  unidadeDosagem: string;
  limiteAplicacoesCiclo: string;
  observacoes: string;
};

type ProdutoAction = (
  prevState: string | undefined,
  formData: FormData,
) => Promise<string | undefined>;

export function ProdutoForm({
  action,
  defaultValues,
  submitLabel,
  produtosExistentes,
  editando = false,
}: {
  action: ProdutoAction;
  defaultValues?: Partial<ProdutoFormValues>;
  submitLabel: string;
  /** Produtos já cadastrados em todas as fazendas — liga as sugestões de nome parecido. */
  produtosExistentes?: ProdutoExistente[];
  /**
   * Editando um produto que já existe: o aviso só aparece quando o nome é
   * mudado, e "Usar este nome" copia só o nome — a unidade do produto nunca
   * é trocada pelo aviso.
   */
  editando?: boolean;
}) {
  const { formAction, isPending, erro, rotulo } = useFormularioAcao(action);
  const [nome, setNome] = useState(defaultValues?.nome ?? "");
  const [unidade, setUnidade] = useState(defaultValues?.unidade ?? "");

  // A unidade atual do produto entra na lista mesmo fora do padrão (ex: "KG"),
  // para que salvar sem mexer nela nunca troque a unidade gravada.
  const opcoesUnidade = useMemo(() => {
    const opcoes: { valor: string; rotulo: string }[] = [...UNIDADES_ESTOQUE];
    for (const extra of [defaultValues?.unidade, unidade]) {
      if (extra && !opcoes.some((o) => o.valor === extra)) opcoes.push({ valor: extra, rotulo: extra });
    }
    return opcoes;
  }, [defaultValues?.unidade, unidade]);

  const nomeOriginal = defaultValues?.nome ?? "";
  const parecidos = useMemo(() => {
    if (!produtosExistentes) return [];
    if (editando && chaveNomeProduto(nome) === chaveNomeProduto(nomeOriginal)) return [];
    return buscarParecidos(nome, produtosExistentes).filter((p) => {
      if (p.nestaFazenda) return true;
      // Some da lista quando já está escrito igual ao produto da outra fazenda.
      return editando ? chaveNomeProduto(p.nome) !== chaveNomeProduto(nome) : !mesmoProduto(p, { nome, unidade });
    });
  }, [nome, unidade, nomeOriginal, editando, produtosExistentes]);

  function usarExistente(produto: ProdutoExistente) {
    setNome(produto.nome);
    if (!editando) setUnidade(unidadeDaLista(produto.unidade));
  }

  function unidadeDiferente(produto: ProdutoExistente) {
    return produto.unidade.trim().toLowerCase() !== unidade.trim().toLowerCase();
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-neutral-700">
          Nome do produto *
        </label>
        <input
          id="nome"
          name="nome"
          required
          autoComplete="off"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base uppercase focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
        <p className="mt-1 text-xs text-neutral-500">O nome é salvo sempre em maiúsculo.</p>

        {parecidos.length > 0 && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
            <p className="px-2 pb-1 text-xs font-medium text-amber-800">
              Já existe produto com nome parecido. Se for o mesmo, use o mesmo nome:
            </p>
            {parecidos.map((p) => (
              <div key={`${p.nome}|${p.unidade}`} className="flex items-center justify-between gap-2 px-2 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900">
                    {p.nome} <span className="font-normal text-neutral-500">({p.unidade})</span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {p.nestaFazenda ? "Já cadastrado nesta fazenda" : `Cadastrado na ${p.fazendas.join(" e na ")}`}
                    {editando && unidade && unidadeDiferente(p) && (
                      <span className="text-amber-700"> · unidade diferente deste produto</span>
                    )}
                  </p>
                </div>
                {!p.nestaFazenda && (
                  <button
                    type="button"
                    onClick={() => usarExistente(p)}
                    className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 active:bg-amber-100"
                  >
                    {editando ? "Usar este nome" : "Usar este"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="unidade" className="mb-1 block text-sm font-medium text-neutral-700">
          Unidade de estoque *
        </label>
        <select
          id="unidade"
          name="unidade"
          required
          value={unidade}
          onChange={(e) => setUnidade(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="" disabled>
            Selecione
          </option>
          {opcoesUnidade.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="unidadeDosagem" className="mb-1 block text-sm font-medium text-neutral-700">
          Unidade de dosagem
        </label>
        <select
          id="unidadeDosagem"
          name="unidadeDosagem"
          defaultValue={defaultValues?.unidadeDosagem ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        >
          <option value="">Não se aplica</option>
          {Object.entries(UNIDADE_DOSAGEM_LABELS).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-neutral-500">
          Necessária para calcular a quantidade automaticamente em Tratamentos Fitossanitários.
        </p>
      </div>

      <div>
        <label htmlFor="limiteAplicacoesCiclo" className="mb-1 block text-sm font-medium text-neutral-700">
          Máximo de aplicações por ciclo
        </label>
        <input
          id="limiteAplicacoesCiclo"
          name="limiteAplicacoesCiclo"
          type="number"
          inputMode="numeric"
          min="1"
          max="1000"
          step="1"
          defaultValue={defaultValues?.limiteAplicacoesCiclo}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Se preenchido, este produto aparece no Resumo do ciclo em Tratamentos, comparando o
          número de aplicações em cada quadra com este limite.
        </p>
      </div>

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

      <Button type="submit" disabled={isPending} size="lg">
        {rotulo(submitLabel)}
      </Button>
    </form>
  );
}
