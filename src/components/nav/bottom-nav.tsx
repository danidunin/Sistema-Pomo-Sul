"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { NAV_ITEMS, type NavItem } from "@/lib/nav-items";

const ITEM_MAIS: NavItem = { href: "/mais", label: "Mais", icon: MoreHorizontal };

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden">
      {[...NAV_ITEMS, ITEM_MAIS].map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              active ? "text-green-700" : "text-neutral-500"
            }`}
          >
            <Icon className="h-6 w-6" strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
