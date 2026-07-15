import Link from "next/link";
import { SECONDARY_NAV_ITEMS } from "@/lib/nav-items";

export default function MaisPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Mais</h1>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {SECONDARY_NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 text-sm font-medium text-neutral-900 last:border-b-0 hover:bg-neutral-50"
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
