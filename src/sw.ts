import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Causa raiz do bug "o app troca de tela sozinho": o `defaultCache` do Serwist
 * guarda em cache as respostas de navegação do Next.js (HTML e payloads RSC do
 * App Router) com estratégia NetworkFirst. O sistema mostra dados agrícolas que
 * mudam o tempo todo (estoque, tratamentos, atividades) — se o navegador cair
 * para uma dessas respostas em cache (rede instável no campo, corrida entre o
 * prefetch automático de links e a navegação real), o Next.js pode acabar
 * renderizando uma página antiga de outra rota já visitada no lugar da atual,
 * o que aparenta ser uma troca de tela espontânea.
 *
 * Estas regras entram ANTES de `defaultCache` na lista — o Serwist usa a
 * primeira que combinar — e forçam rede sempre (nunca cache, nunca fallback
 * para cache) em qualquer navegação de página, payload RSC ou chamada de API.
 * Só ativos estáticos (JS/CSS/fontes/imagens), que nunca mudam de conteúdo
 * para uma URL já publicada, continuam em cache pelas regras do `defaultCache`.
 */
const semCacheDeNavegacao: RuntimeCaching[] = [
  {
    matcher: ({ request, sameOrigin, url: { pathname } }) =>
      sameOrigin &&
      (request.mode === "navigate" || request.headers.get("RSC") === "1" || pathname.startsWith("/api/")),
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...semCacheDeNavegacao, ...defaultCache],
});

serwist.addEventListeners();
