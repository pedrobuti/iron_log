import { describe, expect, it } from "vitest";
import { LocalStorageAdapter, MemoryStorageAdapter, createDefaultAppData, loadAppData, saveAllAppData } from "@/lib/storage";
import { LOCAL_PREFIX } from "@/lib/storage/local";
import { createSessionFromDay, finalizeSession } from "@/lib/session";
import { DEFAULT_EXERCISES } from "@/data/exercises";

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("persistência", () => {
  it("primeiro uso: carrega padrões e sinaliza isFirstRun", async () => {
    const adapter = new MemoryStorageAdapter();
    const r = await loadAppData(adapter);
    expect(r.isFirstRun).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.data.routine.days).toHaveLength(7);
    expect(r.data.exercises.length).toBe(DEFAULT_EXERCISES.length);
    expect(r.data.settings.unit).toBe("kg");
  });

  it("salva e recarrega todas as chaves com integridade (round-trip)", async () => {
    const adapter = new LocalStorageAdapter(fakeStorage());
    const data = createDefaultAppData();
    const day = data.routine.days[0]!;
    const active = createSessionFromDay(day, data.exercises);
    active.exercises[0]!.sets[0] = { ...active.exercises[0]!.sets[0]!, weightKg: 60, reps: 10, rir: 2, completed: true };
    data.sessions = [finalizeSession(active)];
    data.activeSession = createSessionFromDay(data.routine.days[1]!, data.exercises);
    data.settings = { ...data.settings, displayName: "Teste", unit: "lb" };
    data.restLogs = [{ id: "r1", date: "2025-01-16", walkMinutes: 30, mobilityMinutes: null, notes: "ok", createdAt: new Date().toISOString() }];

    await saveAllAppData(adapter, data);
    const r = await loadAppData(adapter);
    expect(r.isFirstRun).toBe(false);
    expect(r.issues).toEqual([]);
    expect(r.data.sessions).toHaveLength(1);
    expect(r.data.sessions[0]?.exercises[0]?.sets[0]?.weightKg).toBe(60);
    expect(r.data.activeSession?.id).toBe(data.activeSession.id);
    expect(r.data.settings.displayName).toBe("Teste");
    expect(r.data.settings.unit).toBe("lb");
    expect(r.data.restLogs[0]?.walkMinutes).toBe(30);
  });

  it("usa prefixo próprio no localStorage", async () => {
    const storage = fakeStorage();
    const adapter = new LocalStorageAdapter(storage);
    await adapter.setItem("settings", createDefaultAppData().settings);
    expect([...storage.map.keys()]).toEqual([`${LOCAL_PREFIX}settings`]);
  });

  it("chave corrompida é substituída pelo padrão e reportada", async () => {
    const storage = fakeStorage();
    storage.setItem(`${LOCAL_PREFIX}routine`, JSON.stringify({ nope: true }));
    storage.setItem(`${LOCAL_PREFIX}sessions`, JSON.stringify([{ id: "x" }, { bad: 1 }]));
    const r = await loadAppData(new LocalStorageAdapter(storage));
    expect(r.data.routine.days).toHaveLength(7);
    expect(r.data.sessions).toEqual([]);
    expect(r.issues.length).toBeGreaterThanOrEqual(2);
  });

  it("JSON inválido gera issue sem derrubar o carregamento", async () => {
    const storage = fakeStorage();
    storage.setItem(`${LOCAL_PREFIX}settings`, "{not json");
    const r = await loadAppData(new LocalStorageAdapter(storage));
    expect(r.data.settings.unit).toBe("kg");
    expect(r.issues[0]).toMatch(/Falha ao ler/);
  });

  it("sessão ativa já concluída não é restaurada como ativa", async () => {
    const adapter = new MemoryStorageAdapter();
    const data = createDefaultAppData();
    const s = finalizeSession(createSessionFromDay(data.routine.days[0]!, data.exercises));
    await adapter.setItem("activeSession", s);
    const r = await loadAppData(adapter);
    expect(r.data.activeSession).toBeNull();
  });

  it("exercícios padrão ausentes são mesclados sem apagar personalizados", async () => {
    const adapter = new MemoryStorageAdapter();
    const custom = { ...DEFAULT_EXERCISES[0]!, id: "meu-ex", name: "Meu exercício", isCustom: true };
    await adapter.setItem("exercises", [custom]);
    const r = await loadAppData(adapter);
    expect(r.data.exercises.find((e) => e.id === "meu-ex")).toBeTruthy();
    expect(r.data.exercises.length).toBe(DEFAULT_EXERCISES.length + 1);
  });

  it("clear remove todas as chaves", async () => {
    const storage = fakeStorage();
    const adapter = new LocalStorageAdapter(storage);
    await saveAllAppData(adapter, createDefaultAppData());
    expect(storage.map.size).toBe(6);
    await adapter.clear();
    expect(storage.map.size).toBe(0);
  });
});
