import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseStorageAdapter } from "@/lib/storage/supabase";

/** Cliente falso que registra as operações feitas em `user_documents`. */
function fakeClient() {
  const ops: { op: string; payload?: unknown; filters: Record<string, string> }[] = [];
  const rows = new Map<string, unknown>();
  const client = {
    from() {
      let current: { op: string; payload?: unknown; filters: Record<string, string> } | null = null;
      const chain = {
        upsert(payload: Record<string, unknown>) {
          current = { op: "upsert", payload, filters: {} };
          ops.push(current);
          rows.set(String(payload.key), payload.data);
          return Promise.resolve({ error: null });
        },
        delete() {
          current = { op: "delete", filters: {} };
          ops.push(current);
          return chain;
        },
        select() {
          current = { op: "select", filters: {} };
          ops.push(current);
          return chain;
        },
        eq(col: string, val: string) {
          if (current) current.filters[col] = val;
          if (current?.op === "delete" && col === "key") rows.delete(val);
          return chain;
        },
        maybeSingle() {
          const key = current?.filters.key ?? "";
          return Promise.resolve({ data: rows.has(key) ? { data: rows.get(key) } : null, error: null });
        },
        then(resolve: (v: { error: null }) => void) {
          resolve({ error: null });
        },
      };
      return chain;
    },
  };
  return { client: client as unknown as SupabaseClient, ops, rows };
}

describe("SupabaseStorageAdapter", () => {
  it("grava documentos com upsert por usuário e chave", async () => {
    const { client, ops } = fakeClient();
    const adapter = new SupabaseStorageAdapter(client, "user-1");
    await adapter.setItem("restLogs", []);
    expect(ops[0]?.op).toBe("upsert");
    expect(ops[0]?.payload).toMatchObject({ user_id: "user-1", key: "restLogs", data: [] });
  });

  it("valor nulo (sem sessão ativa) remove a linha em vez de gravar NULL", async () => {
    const { client, ops, rows } = fakeClient();
    const adapter = new SupabaseStorageAdapter(client, "user-1");
    await adapter.setItem("activeSession", null);
    expect(ops.some((o) => o.op === "upsert")).toBe(false);
    const del = ops.find((o) => o.op === "delete");
    expect(del?.filters).toEqual({ user_id: "user-1", key: "activeSession" });
    expect(rows.has("activeSession")).toBe(false);
    expect(await adapter.getItem("activeSession")).toBeUndefined();
  });
});
