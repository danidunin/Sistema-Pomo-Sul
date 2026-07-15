"use client";

import { useState } from "react";

/**
 * Miniatura de foto com fallback gracioso: se a imagem falhar ao carregar,
 * mostra um cartão com ícone em vez do ícone de imagem quebrada do navegador.
 */
export function FotoMiniatura({
  url,
  alt = "",
  className = "h-14 w-14",
  onClick,
}: {
  url: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}) {
  const [erro, setErro] = useState(false);

  if (erro) {
    return (
      <div
        title="Não foi possível carregar esta foto"
        className={`${className} flex shrink-0 items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400`}
      >
        <span className="text-lg">🖼️</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      onError={() => setErro(true)}
      onClick={onClick}
      className={`${className} shrink-0 rounded-md border border-neutral-200 object-cover ${onClick ? "cursor-pointer" : ""}`}
    />
  );
}
