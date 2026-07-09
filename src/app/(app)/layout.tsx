import { auth } from "@/lib/auth";
import { AppShell } from "@/components/nav/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return <AppShell userName={session?.user?.name ?? ""}>{children}</AppShell>;
}
