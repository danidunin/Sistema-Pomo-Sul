import Link from "next/link";

export function AbasMaquina({ maquinaId, atual }: { maquinaId: string; atual: "manutencoes" | "revisoes" }) {
  return (
    <div className="flex gap-1 border-b border-neutral-200">
      <Link
        href={`/maquinas/${maquinaId}`}
        className={`px-3 py-2 text-sm font-medium ${
          atual === "manutencoes" ? "border-b-2 border-green-700 text-green-800" : "text-neutral-500"
        }`}
      >
        Manutenções
      </Link>
      <Link
        href={`/maquinas/${maquinaId}/revisoes`}
        className={`px-3 py-2 text-sm font-medium ${
          atual === "revisoes" ? "border-b-2 border-green-700 text-green-800" : "text-neutral-500"
        }`}
      >
        Revisões
      </Link>
    </div>
  );
}
