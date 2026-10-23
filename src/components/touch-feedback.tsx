"use client";

import { useEffect } from "react";

/**
 * No Safari/iOS, o pseudo-seletor `:active` do CSS só é respeitado em telas
 * de toque quando existe pelo menos um listener de `touchstart` em algum
 * lugar da página — sem isso, os estilos `active:` do Tailwind (usados pra
 * dar feedback visual de toque nos ícones/botões) simplesmente não aparecem
 * no mobile, mesmo estando corretos no código. Esse listener não faz nada
 * sozinho; ele só "destrava" o `:active` pro resto do app.
 */
export function TouchFeedback() {
  useEffect(() => {
    document.addEventListener("touchstart", () => {}, { passive: true });
  }, []);

  return null;
}
