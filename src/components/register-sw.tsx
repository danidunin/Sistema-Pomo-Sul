"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // instalação do PWA é opcional; falha de registro não deve travar o app
      });
    }
  }, []);

  return null;
}
