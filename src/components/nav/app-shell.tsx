import Link from "next/link";
import { SideNav } from "@/components/nav/side-nav";
import { BottomNav } from "@/components/nav/bottom-nav";
import { logout } from "@/actions/auth";
import { badgeClassName } from "@/components/ui/badge";

export function AppShell({
  children,
  userName,
  propriedadeNome,
}: {
  children: React.ReactNode;
  userName: string;
  propriedadeNome?: string;
}) {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <SideNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-neutral-500 md:hidden">POMO SUL</span>
            {propriedadeNome && (
              <Link href="/" className={badgeClassName("green")}>
                {propriedadeNome}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-neutral-500 md:inline">Olá, {userName}</span>
            <form action={logout}>
              <button type="submit" className="text-sm font-medium text-neutral-500">
                Sair
              </button>
            </form>
          </div>
        </header>

        {/* overflow-x-hidden: rede de segurança — qualquer tela com conteúdo largo (ex:
            uma tabela) que esqueça de conter o próprio overflow nunca mais empurra a
            PÁGINA inteira além da viewport no mobile, o que quebra o rodapé fixo (BottomNav)
            em todas as telas do app, não só na que causou o problema. */}
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-24 pt-4 md:px-6 md:pb-6">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
