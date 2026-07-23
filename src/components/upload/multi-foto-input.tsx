"use client";

import { useState } from "react";
import { converterSeHeic } from "@/lib/converter-heic";

export function MultiFotoInput({ name, pasta, label }: { name: string; pasta: string; label: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivoSelecionado = e.target.files?.[0];
    if (!arquivoSelecionado) return;

    setEnviando(true);
    setErro(null);

    try {
      const file = await converterSeHeic(arquivoSelecionado);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pasta", pasta);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Falha no envio.");
      setUrls((atual) => [...atual, data.url]);
    } catch (e) {
      console.error("Falha ao enviar foto:", e);
      setErro(e instanceof Error && e.message ? e.message : "Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setEnviando(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>

      {urls.map((url) => (
        <input key={url} type="hidden" name={name} value={url} />
      ))}

      {urls.length > 0 && (
        <div className="mb-2 grid grid-cols-4 gap-2">
          {urls.map((url) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={label} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setUrls((atual) => atual.filter((u) => u !== url))}
                aria-label="Remover foto"
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-700"
      />

      {enviando && <p className="mt-1 text-xs text-neutral-500">Enviando...</p>}
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
