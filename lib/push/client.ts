import { getSupabaseClient } from "@/lib/supabase/client";
import { REST_NOTIFICATION_TAG, urlBase64ToUint8Array, type PushSubscriptionInput } from "./shared";

/**
 * Notificações de fim de descanso — lado do navegador.
 *
 * Três camadas, da mais simples à mais robusta:
 * 1. Som + vibração no próprio cronômetro (sempre, quando o app está aberto).
 * 2. Notificação local via service worker quando a aba está em segundo plano
 *    (funciona enquanto o navegador mantém a página viva; no iPhone isso é raro).
 * 3. Web Push agendado pelo servidor (/api/rest-timer): chega com a tela bloqueada.
 *    Exige conta, chaves VAPID no deploy e, no iPhone/iPad, o app instalado na Tela de Início.
 *
 * A preferência é por dispositivo (a permissão também é), por isso fica no localStorage
 * e não em Settings.
 */

const ENABLED_KEY = "ironlog:rest-notifications";
const SW_URL = "/sw.js";
const API_URL = "/api/rest-timer";

export type NotificationPermissionState = NotificationPermission | "unsupported";

export interface RestNotificationStatus {
  /** Notification API + service worker disponíveis. */
  supported: boolean;
  /** Push API disponível neste navegador/contexto. */
  pushSupported: boolean;
  /** Chave pública VAPID presente no build (NEXT_PUBLIC_VAPID_PUBLIC_KEY). */
  pushConfigured: boolean;
  permission: NotificationPermissionState;
  /** Usuário ativou neste dispositivo e a permissão está concedida. */
  enabled: boolean;
  /** Existe inscrição de push ativa no service worker. */
  subscribed: boolean;
  ios: boolean;
  standalone: boolean;
}

/** Contrato usado pelo cronômetro para avisar sobre o ciclo do descanso. */
export interface RestNotifier {
  /** Descanso começou/foi ajustado: termina em `fireAtMs` (epoch ms). */
  schedule: (fireAtMs: number) => void;
  /** Descanso pausado/pulado/abandonado. */
  cancel: () => void;
  /** Descanso chegou a zero com o app aberto. */
  finished: () => void;
}

export function pushPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  return key && key.length > 20 ? key : null;
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function hasNotificationApi(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export function getPermission(): NotificationPermissionState {
  if (!hasNotificationApi()) return "unsupported";
  return Notification.permission;
}

function readFlag(): boolean {
  try {
    return window.localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeFlag(on: boolean) {
  try {
    if (on) window.localStorage.setItem(ENABLED_KEY, "1");
    else window.localStorage.removeItem(ENABLED_KEY);
  } catch {
    /* armazenamento indisponível */
  }
}

/** Síncrono: o usuário ativou neste dispositivo e o navegador permite. */
export function isRestNotificationsEnabled(): boolean {
  return hasNotificationApi() && readFlag() && Notification.permission === "granted";
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    return reg;
  } catch {
    return null;
  }
}

async function readyRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing) return existing;
    return await registerServiceWorker();
  } catch {
    return null;
  }
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await readyRegistration();
  if (!reg || !("pushManager" in reg)) return null;
  try {
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function getRestNotificationStatus(): Promise<RestNotificationStatus> {
  const supported = hasNotificationApi();
  const pushSupported = supported && "PushManager" in window;
  const permission = getPermission();
  const subscribed = pushSupported ? (await currentSubscription()) !== null : false;
  return {
    supported,
    pushSupported,
    pushConfigured: pushPublicKey() !== null,
    permission,
    enabled: supported && readFlag() && permission === "granted",
    subscribed,
    ios: isIos(),
    standalone: isStandalone(),
  };
}

export type EnableResult =
  | { ok: true; subscribed: boolean; warning: string | null }
  | { ok: false; reason: "unsupported" | "ios-install" | "denied" | "sw-failed" };

/** Deve ser chamado a partir de um gesto do usuário (clique). */
export async function enableRestNotifications(): Promise<EnableResult> {
  if (!hasNotificationApi()) return { ok: false, reason: "unsupported" };
  if (isIos() && !isStandalone()) return { ok: false, reason: "ios-install" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const reg = await readyRegistration();
  if (!reg) return { ok: false, reason: "sw-failed" };

  writeFlag(true);

  const key = pushPublicKey();
  if (!key || !("PushManager" in window)) {
    return { ok: true, subscribed: false, warning: !key ? "Push não configurado neste deploy." : "Este navegador não suporta Web Push." };
  }
  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) return { ok: true, subscribed: true, warning: null };
    await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) as BufferSource });
    return { ok: true, subscribed: true, warning: null };
  } catch (err) {
    return { ok: true, subscribed: false, warning: `Inscrição de push falhou: ${err instanceof Error ? err.message : "erro"}` };
  }
}

export async function disableRestNotifications(): Promise<void> {
  writeFlag(false);
  const sub = await currentSubscription();
  if (sub) {
    try {
      await sub.unsubscribe();
    } catch {
      /* já removida */
    }
  }
  void enqueue(() => callApi("DELETE"));
}

/** Notificação imediata pelo service worker (usada quando a aba está em segundo plano). */
export async function showLocalRestNotification(label?: string): Promise<boolean> {
  if (!isRestNotificationsEnabled()) return false;
  const reg = await readyRegistration();
  if (!reg) return false;
  try {
    await reg.showNotification("Descanso finalizado", {
      body: label ? `${label}: bora para a próxima série!` : "Bora para a próxima série!",
      tag: REST_NOTIFICATION_TAG,
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      data: { url: "/treino" },
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Chamadas à API (serializadas para que um cancelamento nunca seja ultrapassado por um agendamento antigo) ───

let queue: Promise<unknown> = Promise.resolve();
let remotePending = false;

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

interface ApiResult {
  status: number;
  body: { error?: string; detail?: string; scheduled?: boolean; cancelled?: boolean } | null;
}

async function accessToken(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

async function callApi(method: "POST" | "DELETE", body?: unknown): Promise<ApiResult> {
  const token = await accessToken();
  if (!token) return { status: 401, body: { error: "sem-sessao" } };
  try {
    const res = await fetch(API_URL, {
      method,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      keepalive: method === "DELETE",
    });
    let json: ApiResult["body"] = null;
    try {
      json = (await res.json()) as ApiResult["body"];
    } catch {
      json = null;
    }
    return { status: res.status, body: json };
  } catch (err) {
    return { status: 0, body: { error: "rede", detail: err instanceof Error ? err.message : "erro" } };
  }
}

/** Agenda o push remoto para `fireAt`. Silencioso: falhas só vão ao console. */
export function scheduleRestPush(fireAt: number, label?: string): void {
  if (!isRestNotificationsEnabled() || !pushPublicKey()) return;
  void enqueue(async () => {
    const sub = await currentSubscription();
    if (!sub) return;
    const subscription = sub.toJSON() as PushSubscriptionInput;
    const r = await callApi("POST", { subscription, fireAt, label });
    if (r.status === 202) remotePending = true;
    else if (r.status !== 401) console.warn("[rest-timer] agendamento recusado:", r.status, r.body?.error ?? "");
  });
}

export function cancelRestPush(): void {
  if (!remotePending) return;
  remotePending = false;
  void enqueue(() => callApi("DELETE"));
}

export function describeApiError(r: ApiResult): string {
  const code = r.body?.error ?? "";
  switch (code) {
    case "push-nao-configurado":
      return "O servidor não tem as chaves VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY).";
    case "tabela-ausente":
      return "Aplique a migration supabase/migrations/0002_rest_timers.sql no Supabase.";
    case "sem-sessao":
    case "nao-autenticado":
    case "sessao-invalida":
      return "Entre na sua conta para receber avisos com a tela bloqueada.";
    case "supabase-nao-configurado":
      return "O Supabase não está configurado neste deploy.";
    case "descanso-longo":
      return "Descansos acima de 4min50s não são agendados no servidor.";
    case "rede":
      return `Sem conexão com o servidor${r.body?.detail ? ` (${r.body.detail})` : ""}.`;
    default:
      return `Erro ${r.status}${code ? ` (${code})` : ""}${r.body?.detail ? `: ${r.body.detail}` : ""}.`;
  }
}

/** Envia um push de teste pelo servidor após `delaySeconds`. */
export async function sendTestNotification(delaySeconds = 5): Promise<{ ok: true } | { ok: false; message: string }> {
  const sub = await currentSubscription();
  if (!sub) return { ok: false, message: "Nenhuma inscrição de push neste dispositivo. Ative as notificações primeiro." };
  const subscription = sub.toJSON() as PushSubscriptionInput;
  const r = await enqueue(() => callApi("POST", { subscription, fireAt: Date.now() + delaySeconds * 1000, test: true }));
  if (r.status === 202) return { ok: true };
  return { ok: false, message: describeApiError(r) };
}
