"use client";

import { useState } from "react";
import { adicionarFotoVisita, excluirFotoVisita } from "@/actions/fotos";
import { converterSeHeic } from "@/lib/converter-heic";
import { FotoMiniatura } from "@/components/upload/foto-miniatura";

type Foto = { id: string; url: string };

export function GaleriaFotosVisita({ visitaId, fotosIniciais }: { visitaId: string; fotosIniciais: Foto[] }) {
  const [fotos, setFotos] = useState(fotosIniciais);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivoSelecionado = e.target.files?.[0];
    if (!arquivoSelecionado) return;

    setEnviando(true);
    setErro(null);

    try {
      const file = await converterSeHeic(arquivoSelecionado);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pasta", "visitas");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Falha no envio.");

      await adicionarFotoVisita(visitaId, data.url);
      setFotos((atual) => [{ id: crypto.randomUUID(), url: data.url }, ...atual]);
    } catch (e) {
      console.error("Falha ao enviar foto da visita:", e);
      setErro(e instanceof Error && e.message ? e.message : "Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setEnviando(false);
      e.target.value = "";
    }
  }

  async function handleExcluir(fotoId: string) {
    setConfirmandoExclusao(null);
    setFotos((atual) => atual.filter((f) => f.id !== fotoId));
    await excluirFotoVisita(visitaId, fotoId);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-700">Fotos</h2>
        <label className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700">
          + Adicionar foto
          <input type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />
        </label>
      </div>

      {enviando && <p className="text-xs text-neutral-500">Enviando...</p>}
      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {fotos.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma foto adicionada ainda.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {fotos.map((foto) => (
            <div key={foto.id} className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200">
              <FotoMiniatura
                url={foto.url}
                className="h-full w-full"
                onClick={() => setFotoAmpliada(foto.url)}
              />
              {confirmandoExclusao === foto.id ? (
                <div className="absolute inset-x-1 top-1 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => handleExcluir(foto.id)}
                    aria-label="Confirmar exclusão da foto"
                    className="rounded-full bg-red-600 px-2 py-1.5 text-xs font-medium text-white"
                  >
                    Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoExclusao(null)}
                    aria-label="Cancelar exclusão"
                    className="rounded-full bg-black/60 px-2 py-1.5 text-xs text-white"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmandoExclusao(foto.id)}
                  aria-label="Excluir foto"
                  className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sm text-white"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fotoAmpliada} alt="Foto da visita de campo" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
