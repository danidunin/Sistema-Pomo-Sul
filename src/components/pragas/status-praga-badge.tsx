import { CORES_NIVEL, type NivelControle } from "@/lib/pragas";

export function StatusPragaBadge({ nivel }: { nivel: NivelControle }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${CORES_NIVEL[nivel].badge}`}>
      {CORES_NIVEL[nivel].texto}
    </span>
  );
}
