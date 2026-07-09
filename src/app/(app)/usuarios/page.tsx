import { db } from "@/lib/db";
import { NovoUsuarioForm } from "@/components/usuarios/novo-usuario-form";

export default async function UsuariosPage() {
  const usuarios = await db.usuario.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, email: true, createdAt: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">Usuários</h1>
        <p className="text-sm text-neutral-500">
          Todos os usuários têm as mesmas permissões: podem ver, cadastrar e editar em todos os módulos.
        </p>
      </div>

      <NovoUsuarioForm />

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {usuarios.map((usuario) => (
          <div
            key={usuario.id}
            className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0"
          >
            <div>
              <p className="text-sm font-medium text-neutral-900">{usuario.nome}</p>
              <p className="text-xs text-neutral-500">{usuario.email}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
