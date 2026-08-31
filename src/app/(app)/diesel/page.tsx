import Link from "next/link";
import { exigirPropriedadeAtual } from "@/lib/propriedade";
import { buscarResumoDiesel } from "@/lib/diesel";
import { MedidorTanque } from "@/components/diesel/medidor-tanque";
import { formatarData } from "@/lib/format";

export default async function DieselPage() {
  const propriedadeId = await exigirPropriedadeAtual();
  const resumo = await buscarResumoDiesel(propriedadeId);

  if (!resumo) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-neutral-900">Controle de Diesel</h1>
        <p className="text-sm text-neutral-500">Nenhum tanque cadastrado ainda para esta propriedade.</p>
        <Link
          href="/diesel/tanque/novo"
          className="w-fit rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
        >
          + Cadastrar tanque
        </Link>
      </div>
    );
  }

  const { tanque, consumoMesLitros, ultimaMovimentacao, percentualOcupado, alerta } = resumo;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-neutral-900">Controle de Diesel</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/diesel/movimentacoes/nova?tipo=entrada"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            + Entrada
          </Link>
          <Link
            href="/diesel/movimentacoes/nova?tipo=saida"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            + Saída
          </Link>
          <Link
            href={`/diesel/tanque/${tanque.id}/editar`}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            Editar tanque
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cartao label="Estoque atual" valor={`${Number(tanque.estoqueAtualLitros).toLocaleString("pt-BR")} L`} />
        <Cartao label="Capacidade do tanque" valor={`${Number(tanque.capacidadeLitros).toLocaleString("pt-BR")} L`} />
        <Cartao label="Consumo no mês" valor={`${consumoMesLitros.toLocaleString("pt-BR")} L`} />
        <Cartao
          label="Última movimentação"
          valor={
            ultimaMovimentacao
              ? `${ultimaMovimentacao.tipo === "ENTRADA" ? "Entrada" : "Saída"} · ${ultimaMovimentacao.quantidadeLitros.toLocaleString("pt-BR")} L`
              : "—"
          }
          detalhe={ultimaMovimentacao ? formatarData(ultimaMovimentacao.data) : undefined}
        />
      </div>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-white p-6">
        <p className="text-sm font-medium text-neutral-700">Nível do tanque — {tanque.nome}</p>
        <MedidorTanque percentual={percentualOcupado} alerta={alerta} />
      </div>

      <Link href="/diesel/historico" className="text-sm font-medium text-green-700">
        Ver histórico completo →
      </Link>
    </div>
  );
}

function Cartao({ label, valor, detalhe }: { label: string; valor: string; detalhe?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-4">
      <span className="text-lg font-semibold text-neutral-900">{valor}</span>
      <span className="text-xs text-neutral-500">{label}</span>
      {detalhe && <span className="text-xs text-neutral-400">{detalhe}</span>}
    </div>
  );
}
