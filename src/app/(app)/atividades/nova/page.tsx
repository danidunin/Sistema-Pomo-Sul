import { db } from "@/lib/db";
import { AtividadeForm } from "@/components/atividades/atividade-form";

export default async function NovaAtividadePage() {
  const [tiposAtividade, talhoes, usuarios] = await Promise.all([
    db.tipoAtividade.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    db.talhao.findMany({ orderBy: { nomeCodinome: "asc" }, select: { id: true, nomeCodinome: true } }),
    db.usuario.findMany({ orderBy: { nome: "asc" } }),
  ]);

  if (talhoes.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-neutral-900">Nova atividade</h1>
        <p className="text-sm text-neutral-500">Cadastre um talhão antes de registrar uma atividade.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Nova atividade</h1>
      <AtividadeForm
        tiposAtividade={tiposAtividade}
        talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nomeCodinome }))}
        usuarios={usuarios}
      />
    </div>
  );
}
