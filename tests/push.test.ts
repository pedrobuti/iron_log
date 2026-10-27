import { describe, expect, it } from "vitest";
import {
  exceedsMaxDelay,
  MAX_PUSH_DELAY_MS,
  PUSH_FIRE_GRACE_MS,
  pushDelayMs,
  restNotificationPayload,
  scheduleBodySchema,
  urlBase64ToUint8Array,
} from "@/lib/push/shared";
import { scheduleRestPush, type RestPushDeps, type RestTimerRow } from "@/lib/push/server";
import { bearerToken } from "@/lib/supabase/server";

const SUB = { endpoint: "https://push.example.com/abc", keys: { p256dh: "p", auth: "a" } };

function fakeDeps(overrides: Partial<RestPushDeps> = {}) {
  const rows = new Map<string, RestTimerRow>();
  const sent: string[] = [];
  let now = 1_000_000;
  let tokenCounter = 0;
  const deps: RestPushDeps = {
    store: {
      async upsert(userId, row) {
        rows.set(userId, row);
      },
      async read(userId) {
        return rows.get(userId) ?? null;
      },
      async remove(userId) {
        rows.delete(userId);
      },
    },
    sendPush: async (_sub, payload) => {
      sent.push(payload.body);
      return { ok: true };
    },
    sleep: async (ms) => {
      now += ms;
    },
    now: () => now,
    newToken: () => `tok-${++tokenCounter}`,
    ...overrides,
  };
  return { deps, rows, sent, getNow: () => now };
}

describe("push/shared", () => {
  it("valida o corpo do agendamento", () => {
    expect(scheduleBodySchema.safeParse({ subscription: SUB, fireAt: 123 }).success).toBe(true);
    expect(scheduleBodySchema.safeParse({ subscription: { endpoint: "nope", keys: SUB.keys }, fireAt: 123 }).success).toBe(false);
    expect(scheduleBodySchema.safeParse({ subscription: SUB, fireAt: -1 }).success).toBe(false);
    expect(scheduleBodySchema.safeParse({ subscription: SUB }).success).toBe(false);
  });

  it("calcula o atraso com folga e nunca negativo", () => {
    expect(pushDelayMs(10_000, 4_000)).toBe(6_000 + PUSH_FIRE_GRACE_MS);
    expect(pushDelayMs(1_000, 50_000)).toBe(0);
  });

  it("recusa descansos acima do limite da função", () => {
    expect(exceedsMaxDelay(100 + MAX_PUSH_DELAY_MS, 100)).toBe(false);
    expect(exceedsMaxDelay(101 + MAX_PUSH_DELAY_MS, 100)).toBe(true);
  });

  it("monta o texto da notificação", () => {
    expect(restNotificationPayload("t", "Supino reto").body).toBe("Supino reto: bora para a próxima série!");
    expect(restNotificationPayload("t").body).toBe("Bora para a próxima série!");
    expect(restNotificationPayload("t", undefined, true).title).toMatch(/teste/i);
    expect(restNotificationPayload("t").url).toBe("/treino");
  });

  it("decodifica chave VAPID base64url", () => {
    const bytes = urlBase64ToUint8Array("AQID-_8"); // 01 02 03 FB FF
    expect(Array.from(bytes)).toEqual([1, 2, 3, 251, 255]);
  });

  it("extrai o bearer token", () => {
    expect(bearerToken("Bearer abc.def")).toBe("abc.def");
    expect(bearerToken("bearer   xyz ")).toBe("xyz");
    expect(bearerToken("Basic xyz")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});

describe("push/server scheduleRestPush", () => {
  it("espera até o fim do descanso e envia quando o token continua válido", async () => {
    const { deps, sent, getNow } = fakeDeps();
    const start = getNow();
    const job = await scheduleRestPush(deps, { userId: "u1", subscription: SUB, fireAt: start + 90_000, label: "Remada" });
    const result = await job.run();
    expect(result).toEqual({ sent: true });
    expect(sent).toEqual(["Remada: bora para a próxima série!"]);
    expect(getNow() - start).toBe(90_000 + PUSH_FIRE_GRACE_MS);
  });

  it("não envia se o descanso foi cancelado (linha removida)", async () => {
    const { deps, rows, sent } = fakeDeps();
    const job = await scheduleRestPush(deps, { userId: "u1", subscription: SUB, fireAt: deps.now() + 60_000 });
    rows.delete("u1"); // DELETE /api/rest-timer chegou antes
    expect(await job.run()).toEqual({ sent: false, reason: "cancelado" });
    expect(sent).toEqual([]);
  });

  it("só o agendamento mais recente dispara quando o descanso é ajustado", async () => {
    const { deps, sent } = fakeDeps();
    const first = await scheduleRestPush(deps, { userId: "u1", subscription: SUB, fireAt: deps.now() + 60_000 });
    const second = await scheduleRestPush(deps, { userId: "u1", subscription: SUB, fireAt: deps.now() + 75_000, label: "Agachamento" });
    expect(await first.run()).toEqual({ sent: false, reason: "substituido" });
    expect(await second.run()).toEqual({ sent: true });
    expect(sent).toEqual(["Agachamento: bora para a próxima série!"]);
  });

  it("consome a linha após enviar, evitando reenvio", async () => {
    const { deps, rows } = fakeDeps();
    const job = await scheduleRestPush(deps, { userId: "u1", subscription: SUB, fireAt: deps.now() + 1_000 });
    await job.run();
    expect(rows.has("u1")).toBe(false);
  });

  it("classifica inscrição expirada (404/410) e outros erros de envio", async () => {
    const expired = fakeDeps({ sendPush: async () => ({ ok: false, statusCode: 410, message: "Gone" }) });
    const j1 = await scheduleRestPush(expired.deps, { userId: "u1", subscription: SUB, fireAt: expired.deps.now() + 10 });
    expect(await j1.run()).toMatchObject({ sent: false, reason: "inscricao-expirada" });

    const failing = fakeDeps({ sendPush: async () => ({ ok: false, statusCode: 500, message: "boom" }) });
    const j2 = await scheduleRestPush(failing.deps, { userId: "u1", subscription: SUB, fireAt: failing.deps.now() + 10 });
    expect(await j2.run()).toMatchObject({ sent: false, reason: "erro-envio", detail: "boom" });
  });

  it("não envia quando não consegue confirmar o cancelamento", async () => {
    const base = fakeDeps();
    const deps: RestPushDeps = {
      ...base.deps,
      store: { ...base.deps.store, read: async () => Promise.reject(new Error("db off")) },
    };
    const job = await scheduleRestPush(deps, { userId: "u1", subscription: SUB, fireAt: deps.now() + 10 });
    expect(await job.run()).toMatchObject({ sent: false, reason: "erro-leitura" });
    expect(base.sent).toEqual([]);
  });
});
