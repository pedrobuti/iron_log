import { z } from "zod";

/**
 * Regras compartilhadas entre o navegador e a rota de API do cronômetro de descanso.
 *
 * Fluxo: ao concluir uma série o app envia { subscription, fireAt } para /api/rest-timer.
 * O servidor grava um token em `rest_timers`, responde na hora e continua executando
 * (Next `after`) até `fireAt`; então relê o token e, se ainda for o mesmo, envia o push.
 * Pular/pausar/ajustar o descanso apaga ou substitui o token, cancelando o aviso.
 */

/** Limite da função na Vercel (plano Hobby: 300 s). Mantemos margem para o envio. */
export const MAX_FUNCTION_SECONDS = 300;
export const MAX_PUSH_DELAY_MS = (MAX_FUNCTION_SECONDS - 10) * 1000;
/** Pequeno atraso após o fim do descanso para dar tempo de o app (se visível) cancelar o push. */
export const PUSH_FIRE_GRACE_MS = 1500;
/** Tag única: uma nova notificação substitui a anterior em vez de empilhar. */
export const REST_NOTIFICATION_TAG = "ironlog-rest";

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const scheduleBodySchema = z.object({
  subscription: pushSubscriptionSchema,
  /** Instante (epoch ms) em que o descanso termina. */
  fireAt: z.number().int().positive(),
  /** Nome do exercício, só para o texto da notificação. */
  label: z.string().trim().max(80).optional(),
  /** Marca envios de teste (texto diferente). */
  test: z.boolean().optional(),
});
export type ScheduleBody = z.infer<typeof scheduleBodySchema>;

export interface RestPushPayload {
  title: string;
  body: string;
  url: string;
  token: string;
  tag: string;
}

export function restNotificationPayload(token: string, label?: string, test = false): RestPushPayload {
  if (test) {
    return {
      title: "IronLog — teste",
      body: "As notificações de descanso estão funcionando neste dispositivo.",
      url: "/perfil",
      token,
      tag: REST_NOTIFICATION_TAG,
    };
  }
  return {
    title: "Descanso finalizado",
    body: label ? `${label}: bora para a próxima série!` : "Bora para a próxima série!",
    url: "/treino",
    token,
    tag: REST_NOTIFICATION_TAG,
  };
}

/** Quanto esperar até enviar, já com a folga de cancelamento. Nunca negativo. */
export function pushDelayMs(fireAt: number, now: number): number {
  return Math.max(0, fireAt + PUSH_FIRE_GRACE_MS - now);
}

/** Descansos maiores que a duração máxima da função não podem ser agendados no servidor. */
export function exceedsMaxDelay(fireAt: number, now: number): boolean {
  return fireAt - now > MAX_PUSH_DELAY_MS;
}

/** Converte a chave pública VAPID (base64url) para o formato esperado pelo PushManager. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof atob === "function" ? atob(normalized) : Buffer.from(normalized, "base64").toString("binary");
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
