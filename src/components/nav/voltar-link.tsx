import Link from "next/link";

export function VoltarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="rounded-md text-sm font-medium text-green-700 active:text-green-900">
      ← {label}
    </Link>
  );
}
