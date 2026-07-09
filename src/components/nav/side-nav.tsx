"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, SECONDARY_NAV_ITEMS, type NavItem } from "@/lib/nav-items";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
        active ? "bg-green-50 text-green-700" : "text-neutral-600 hover:bg-neutral-50"
      }`}
    >
      <span className="text-base">{item.icon}</span>
      {item.label}
    </Link>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const isActive = (item: NavItem) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  return (
    <nav className="hidden w-56 shrink-0 flex-col border-r border-neutral-200 bg-white p-4 md:flex">
      <div className="mb-6 px-2 text-lg font-semibold text-neutral-900">POMO SUL</div>
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} />
        ))}
      </div>

      <div className="my-3 border-t border-neutral-100" />

      <div className="flex flex-col gap-1">
        {SECONDARY_NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} />
        ))}
      </div>
    </nav>
  );
}
