import { db } from "@/lib/db";
import { OperacaoForm } from "@/components/operacoes/operacao-form";

export default async function NovaOperacaoPage() {
  const [talhoes, produtos, usuarios, maquinas] = await Promise.all([
    db.talhao.findMany({ orderBy: { nomeCodinome: "asc" }, select: { id: true, nomeCodinome: true } }),
    db.produto.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, unidade: true } }),
    db.usuario.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    db.maquina.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  if (talhoes.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-neutral-900">Nova operação</h1>
        <p className="text-sm text-neutral-500">Cadastre um talhão antes de registrar uma operação.</p>
      </div>
    );
  }

  if (produtos.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-neutral-900">Nova operação</h1>
        <p className="text-sm text-neutral-500">Cadastre um produto no estoque antes de registrar uma operação.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Nova operação agrícola</h1>
      <OperacaoForm
        talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nomeCodinome }))}
        produtos={produtos}
        usuarios={usuarios}
        maquinas={maquinas}
      />
    </div>
  );
}
