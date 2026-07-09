import { SideNav } from "@/components/nav/side-nav";
import { BottomNav } from "@/components/nav/bottom-nav";
import { logout } from "@/actions/auth";

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <SideNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:px-6">
          <span className="text-sm font-medium text-neutral-500 md:hidden">POMO SUL</span>
          <span className="hidden text-sm text-neutral-500 md:inline">Olá, {userName}</span>
          <form action={logout}>
            <button type="submit" className="text-sm font-medium text-neutral-500">
              Sair
            </button>
          </form>
        </header>

        <main className="flex-1 px-4 pb-20 pt-4 md:px-6 md:pb-6">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
