import { db } from "@/lib/db";
import { NovaEntradaForm } from "@/components/estoque/nova-entrada-form";

export default async function NovaEntradaPage() {
  const produtos = await db.produto.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, unidade: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Entrada de estoque</h1>
      {produtos.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Cadastre um produto antes de registrar uma entrada de estoque.
        </p>
      ) : (
        <NovaEntradaForm produtos={produtos} />
      )}
    </div>
  );
}
