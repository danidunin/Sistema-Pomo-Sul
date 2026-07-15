import Link from "next/link";

export function VoltarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm font-medium text-green-700">
      ← {label}
    </Link>
  );
}
