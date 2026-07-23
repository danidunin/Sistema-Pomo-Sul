export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold text-neutral-900">Sem conexão</h1>
      <p className="max-w-xs text-sm text-neutral-600">
        Não foi possível carregar esta página porque o dispositivo está sem sinal de internet.
        Assim que a conexão voltar, tente novamente.
      </p>
    </div>
  );
}
