"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push/client";

/** Registra o service worker de notificações (sem cache de páginas). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}
