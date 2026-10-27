import { randomUUID } from "node:crypto";
import { after, NextResponse } from "next/server";
import webpush from "web-push";
import { bearerToken, createUserScopedClient } from "@/lib/supabase/server";
import { scheduleRestPush, supabaseRestTimerStore, vapidConfig, type RestPushDeps } from "@/lib/push/server";
import { exceedsMaxDelay, MAX_FUNCTION_SECONDS, scheduleBodySchema } from "@/lib/push/shared";

/**
 * Agenda (POST) ou cancela (DELETE) a notificação de fim de descanso.
 *
 * A função responde imediatamente e segue viva (Next `after`) até o fim do descanso,
 * quando envia o Web Push. Por isso `maxDuration` = 300 s (limite do plano Hobby da
 * Vercel com Fluid Compute). Descansos maiores são recusados e o app usa só o aviso local.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Precisa ser literal (o Next lê a config estaticamente). Mantido igual a MAX_FUNCTION_SECONDS em lib/push/shared.ts.
export const maxDuration = 300;

async function authenticate(req: Request) {
  const jwt = bearerToken(req.headers.get("authorization"));
  if (!jwt) return { error: NextResponse.json({ error: "nao-autenticado" }, { status: 401 }) } as const;
  const client = createUserScopedClient(jwt);
  if (!client) return { error: NextResponse.json({ error: "supabase-nao-configurado" }, { status: 503 }) } as const;
  const { data, error } = await client.auth.getUser(jwt);
  if (error || !data.user) return { error: NextResponse.json({ error: "sessao-invalida" }, { status: 401 }) } as const;
  return { client, userId: data.user.id } as const;
}

export async function POST(req: Request) {
  const vapid = vapidConfig();
  if (!vapid) return NextResponse.json({ error: "push-nao-configurado" }, { status: 503 });

  const auth = await authenticate(req);
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "json-invalido" }, { status: 400 });
  }
  const parsed = scheduleBodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "corpo-invalido", issues: parsed.error.issues }, { status: 400 });

  const now = Date.now();
  if (exceedsMaxDelay(parsed.data.fireAt, now)) return NextResponse.json({ error: "descanso-longo" }, { status: 422 });

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  const deps: RestPushDeps = {
    store: supabaseRestTimerStore(auth.client),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    now: () => Date.now(),
    newToken: () => randomUUID(),
    sendPush: async (subscription, payload) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 120, urgency: "high", topic: "ironlog-rest" });
        return { ok: true };
      } catch (err) {
        const e = err as { statusCode?: number; message?: string };
        return { ok: false, statusCode: e.statusCode, message: e.message };
      }
    },
  };

  try {
    const job = await scheduleRestPush(deps, { userId: auth.userId, ...parsed.data });
    after(async () => {
      const result = await job.run();
      if (!result.sent && result.reason !== "cancelado" && result.reason !== "substituido") {
        console.warn("[rest-timer] push não enviado:", result.reason, result.detail ?? "");
      }
    });
    return NextResponse.json({ scheduled: true, token: job.token, fireAt: parsed.data.fireAt }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro";
    // Tabela ausente = migration 0002 não aplicada.
    const status = /rest_timers/.test(message) ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? "tabela-ausente" : "erro-agendamento", detail: message }, { status });
  }
}

export async function DELETE(req: Request) {
  const auth = await authenticate(req);
  if ("error" in auth) return auth.error;
  try {
    await supabaseRestTimerStore(auth.client).remove(auth.userId);
    return NextResponse.json({ cancelled: true });
  } catch (err) {
    return NextResponse.json({ error: "erro-cancelamento", detail: err instanceof Error ? err.message : "erro" }, { status: 500 });
  }
}

/** Diagnóstico: informa se o servidor está pronto para enviar push (sem expor segredos). */
export async function GET() {
  return NextResponse.json({ pushConfigured: vapidConfig() !== null, maxRestSeconds: MAX_FUNCTION_SECONDS - 10 });
}
