"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      // O Serwist fica desativado em dev (next.config.ts) — se o navegador já
      // tinha um service worker registrado de uma sessão anterior (ex: alguém
      // rodou a versão de produção localmente em algum momento), ele continua
      // servindo páginas antigas em cache mesmo com o servidor rodando código
      // novo. Em dev, desregistra qualquer worker existente em vez de
      // registrar um novo, pra nunca haver cache velho escondido no meio do
      // desenvolvimento local.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) registration.unregister();
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // instalação do PWA é opcional; falha de registro não deve travar o app
    });
  }, []);

  return null;
}
