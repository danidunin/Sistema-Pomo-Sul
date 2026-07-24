export function MedidorTanque({ percentual, alerta }: { percentual: number; alerta: boolean }) {
  const pct = Math.max(0, Math.min(100, percentual));
  const cor = alerta ? "#dc2626" : pct < 50 ? "#d97706" : "#15803d";

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex h-36 w-36 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${cor} ${pct * 3.6}deg, #e5e5e5 ${pct * 3.6}deg)` }}
      >
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
          <span className="text-2xl font-bold text-neutral-900">{pct.toFixed(0)}%</span>
          <span className="text-xs text-neutral-500">ocupado</span>
        </div>
      </div>
      {alerta && (
        <p className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
          Estoque abaixo do mínimo
        </p>
      )}
    </div>
  );
}
