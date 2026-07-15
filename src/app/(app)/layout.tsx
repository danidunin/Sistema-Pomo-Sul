import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { propriedadeAtualId } from "@/lib/propriedade";
import { AppShell } from "@/components/nav/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, propriedadeId] = await Promise.all([auth(), propriedadeAtualId()]);

  const propriedade = propriedadeId
    ? await db.propriedade.findUnique({ where: { id: propriedadeId }, select: { nome: true } })
    : null;

  return (
    <AppShell userName={session?.user?.name ?? ""} propriedadeNome={propriedade?.nome}>
      {children}
    </AppShell>
  );
}
