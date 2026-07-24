"use client";

import { useState } from "react";
import { atualizarFotoPrincipalMaquina } from "@/actions/fotos";

export function FotoPrincipal({
  maquinaId,
  fotoUrl,
  nome,
}: {
  maquinaId: string;
  fotoUrl: string | null;
  nome: string;
}) {
  const [url, setUrl] = useState(fotoUrl);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivoSelecionado = e.target.files?.[0];
    if (!arquivoSelecionado) return;

    setEnviando(true);
    setErro(null);

    try {
      const formData = new FormData();
      formData.append("file", arquivoSelecionado);
      formData.append("pasta", "maquinas");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Falha no envio.");

      await atualizarFotoPrincipalMaquina(maquinaId, data.url);
      setUrl(data.url);
    } catch (e) {
      console.error("Falha ao enviar foto principal da máquina:", e);
      setErro(e instanceof Error && e.message ? e.message : "Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setEnviando(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <label className="relative block h-[125px] w-[125px] cursor-pointer overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 sm:h-[146px] sm:w-[146px]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={nome} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-center text-[11px] text-neutral-400">
            <span className="text-lg">+</span>
            Adicionar foto
          </span>
        )}
        <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </label>
      {enviando && <p className="text-[11px] text-neutral-500">Enviando...</p>}
      {erro && <p className="max-w-[7rem] text-center text-[11px] text-red-600">{erro}</p>}
    </div>
  );
}
