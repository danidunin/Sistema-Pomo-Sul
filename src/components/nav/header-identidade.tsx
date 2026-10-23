"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { badgeClassName } from "@/components/ui/badge";

/**
 * Nome da propriedade (e "POMO SUL" no mobile) no cabeçalho. Na Home o mobile
 * já mostra essa mesma informação, em destaque, sobre a foto do hero — por
 * isso aqui ela some no mobile só nessa rota, pra não duplicar; nas demais
 * telas (sem hero) ela continua sendo a única referência de marca/propriedade
 * visível no mobile.
 */
export function HeaderIdentidade({ propriedadeNome }: { propriedadeNome?: string }) {
  const pathname = usePathname();
  const naHome = pathname === "/";

  return (
    <div className={`items-center gap-3 ${naHome ? "hidden md:flex" : "flex"}`}>
      <span className="text-sm font-medium text-neutral-500 md:hidden">POMO SUL</span>
      {propriedadeNome && (
        <Link href="/" className={badgeClassName("green")}>
          {propriedadeNome}
        </Link>
      )}
    </div>
  );
}
