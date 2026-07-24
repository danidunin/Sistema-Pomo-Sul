"use client";

import { useState } from "react";

export function FotoInput({
  name,
  pasta,
  label,
  defaultUrl,
}: {
  name: string;
  pasta: string;
  label: string;
  defaultUrl?: string | null;
}) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivoSelecionado = e.target.files?.[0];
    if (!arquivoSelecionado) return;

    setEnviando(true);
    setErro(null);

    try {
      const formData = new FormData();
      formData.append("file", arquivoSelecionado);
      formData.append("pasta", pasta);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Falha no envio.");
      setUrl(data.url);
    } catch (e) {
      console.error("Falha ao enviar foto:", e);
      setErro(e instanceof Error && e.message ? e.message : "Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      <input type="hidden" name={name} value={url} />

      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="mb-2 h-32 w-32 rounded-lg border border-neutral-200 object-cover" />
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-700"
      />

      {enviando && <p className="mt-1 text-xs text-neutral-500">Enviando...</p>}
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
