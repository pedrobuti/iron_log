"use client";

import { useEffect, useState } from "react";

export type WakeLockState = "inativo" | "ativo" | "indisponivel";

/**
 * Mantém a tela acesa enquanto `enabled` for true (Screen Wake Lock API).
 * O bloqueio é liberado automaticamente pelo navegador quando a aba sai de foco,
 * por isso é readquirido ao voltar. Sem suporte, informa "indisponivel".
 */
export function useWakeLock(enabled: boolean): WakeLockState {
  const [state, setState] = useState<WakeLockState>("inativo");

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      const id = setTimeout(() => setState("indisponivel"), 0);
      return () => clearTimeout(id);
    }

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        const s = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void s.release();
          return;
        }
        sentinel = s;
        s.addEventListener("release", () => {
          if (!cancelled) setState("inativo");
        });
        setState("ativo");
      } catch {
        setState("indisponivel");
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release();
    };
  }, [enabled]);

  return enabled ? state : "inativo";
}
