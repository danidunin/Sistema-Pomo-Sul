import Link from "next/link";
import { SideNav } from "@/components/nav/side-nav";
import { BottomNav } from "@/components/nav/bottom-nav";
import { logout } from "@/actions/auth";

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
              <Link
                href="/"
                className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
              >
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

        <main className="flex-1 px-4 pb-20 pt-4 md:px-6 md:pb-6">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
