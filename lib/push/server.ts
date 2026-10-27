import type { SupabaseClient } from "@supabase/supabase-js";
import { pushDelayMs, restNotificationPayload, type PushSubscriptionInput, type RestPushPayload } from "./shared";

/**
 * Núcleo da rota /api/rest-timer, sem dependência de Next ou do web-push,
 * para ser testável. A rota injeta as implementações reais.
 */

export interface RestTimerRow {
  token: string;
  fireAt: number;
}

export interface RestTimerStore {
  /** Grava o descanso agendado do usuário (substitui o anterior). */
  upsert(userId: string, row: RestTimerRow): Promise<void>;
  /** Lê o descanso agendado atual, ou null se foi cancelado. */
  read(userId: string): Promise<RestTimerRow | null>;
  remove(userId: string): Promise<void>;
}

export interface SendPushResult {
  ok: boolean;
  /** Código HTTP do serviço de push, quando houve erro. */
  statusCode?: number;
  message?: string;
}

export interface RestPushDeps {
  store: RestTimerStore;
  sendPush: (subscription: PushSubscriptionInput, payload: RestPushPayload) => Promise<SendPushResult>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  newToken: () => string;
}

export type RestPushJobResult =
  | { sent: true }
  | { sent: false; reason: "cancelado" | "substituido" | "inscricao-expirada" | "erro-envio" | "erro-leitura"; detail?: string };

export interface ScheduledRestPush {
  token: string;
  /** Executa a espera e o envio. Deve rodar após a resposta (Next `after`). */
  run: () => Promise<RestPushJobResult>;
}

/**
 * Registra o descanso e devolve o job que espera até `fireAt` e envia o push
 * se o token continuar válido.
 */
export async function scheduleRestPush(
  deps: RestPushDeps,
  input: { userId: string; subscription: PushSubscriptionInput; fireAt: number; label?: string; test?: boolean },
): Promise<ScheduledRestPush> {
  const token = deps.newToken();
  await deps.store.upsert(input.userId, { token, fireAt: input.fireAt });
  const payload = restNotificationPayload(token, input.label, input.test);

  async function run(): Promise<RestPushJobResult> {
    await deps.sleep(pushDelayMs(input.fireAt, deps.now()));
    let current: RestTimerRow | null;
    try {
      current = await deps.store.read(input.userId);
    } catch (err) {
      // Sem conseguir confirmar o cancelamento, não enviamos: um aviso indevido
      // depois de pular o descanso incomoda mais do que um aviso perdido.
      return { sent: false, reason: "erro-leitura", detail: err instanceof Error ? err.message : String(err) };
    }
    if (!current) return { sent: false, reason: "cancelado" };
    if (current.token !== token) return { sent: false, reason: "substituido" };

    const res = await deps.sendPush(input.subscription, payload);
    if (res.ok) {
      // Linha consumida: evita que um reenvio tardio reutilize o mesmo token.
      await deps.store.remove(input.userId).catch(() => undefined);
      return { sent: true };
    }
    if (res.statusCode === 404 || res.statusCode === 410) return { sent: false, reason: "inscricao-expirada", detail: res.message };
    return { sent: false, reason: "erro-envio", detail: res.message };
  }

  return { token, run };
}

/** Implementação do store sobre a tabela `rest_timers` (RLS com o JWT do usuário). */
export function supabaseRestTimerStore(client: SupabaseClient): RestTimerStore {
  return {
    async upsert(userId, row) {
      const { error } = await client
        .from("rest_timers")
        .upsert({ user_id: userId, token: row.token, fire_at: new Date(row.fireAt).toISOString() }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    },
    async read(userId) {
      const { data, error } = await client.from("rest_timers").select("token, fire_at").eq("user_id", userId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const d = data as { token: string; fire_at: string };
      return { token: d.token, fireAt: new Date(d.fire_at).getTime() };
    },
    async remove(userId) {
      const { error } = await client.from("rest_timers").delete().eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
  };
}

/** Lê a configuração VAPID do servidor. A chave privada nunca sai do servidor. */
export function vapidConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: subject && /^(mailto:|https:\/\/)/.test(subject) ? subject : "mailto:ironlog@example.com" };
}
