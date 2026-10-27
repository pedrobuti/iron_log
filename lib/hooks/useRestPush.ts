"use client";

import { useMemo, type RefObject } from "react";
import { cancelRestPush, scheduleRestPush, showLocalRestNotification, type RestNotifier } from "@/lib/push/client";

/**
 * Liga o cronômetro de descanso às notificações:
 * - push remoto (servidor) quando o usuário ativou as notificações neste dispositivo;
 * - notificação local se o descanso zera com a aba em segundo plano.
 * `labelRef` carrega o nome do exercício da última série concluída.
 */
export function useRestPush(labelRef: RefObject<string | undefined>): RestNotifier {
  return useMemo<RestNotifier>(
    () => ({
      schedule: (fireAt) => scheduleRestPush(fireAt, labelRef.current ?? undefined),
      cancel: () => cancelRestPush(),
      finished: () => {
        cancelRestPush();
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
          void showLocalRestNotification(labelRef.current ?? undefined);
        }
      },
    }),
    [labelRef],
  );
}
