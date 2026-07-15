"use client";

import { useState } from "react";

type Arquivo = { url: string; nome: string };

export function MultiArquivoInput({ name, pasta, label }: { name: string; pasta: string; label: string }) {
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setEnviando(true);
    setErro(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("pasta", pasta);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Falha no envio.");
      setArquivos((atual) => [...atual, { url: data.url, nome: file.name }]);
    } catch (e) {
      console.error("Falha ao enviar arquivo:", e);
      setErro(e instanceof Error && e.message ? e.message : "Não foi possível enviar o arquivo. Tente novamente.");
    } finally {
      setEnviando(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>

      {arquivos.map((arquivo) => (
        <input key={arquivo.url + "-url"} type="hidden" name={`${name}[]`} value={arquivo.url} />
      ))}
      {arquivos.map((arquivo) => (
        <input key={arquivo.url + "-nome"} type="hidden" name={`${name}Nomes[]`} value={arquivo.nome} />
      ))}

      {arquivos.length > 0 && (
        <div className="mb-2 flex flex-col gap-1">
          {arquivos.map((arquivo) => (
            <div
              key={arquivo.url}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2"
            >
              <span className="flex items-center gap-2 truncate text-sm text-neutral-700">
                <span>📄</span>
                <span className="truncate">{arquivo.nome}</span>
              </span>
              <button
                type="button"
                onClick={() => setArquivos((atual) => atual.filter((a) => a.url !== arquivo.url))}
                aria-label="Remover arquivo"
                className="shrink-0 rounded-full px-2 py-0.5 text-xs text-neutral-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        type="file"
        accept="application/pdf"
        onChange={handleChange}
        className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-700"
      />

      {enviando && <p className="mt-1 text-xs text-neutral-500">Enviando...</p>}
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
