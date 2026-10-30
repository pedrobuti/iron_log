import { describe, expect, it } from "vitest";
import { createBackup, parseBackup } from "@/lib/backup";
import { createDefaultAppData } from "@/lib/storage";
import { sessionsToCsv } from "@/lib/csv";
import { createSessionFromDay, finalizeSession, sessionProgress, summarizeForFinish, withDuration } from "@/lib/session";
import { fromDisplayWeight, toDisplayWeight } from "@/lib/units";

describe("backup JSON", () => {
  it("exporta e reimporta sem perdas", () => {
    const data = createDefaultAppData();
    data.settings.displayName = "Ana";
    const raw = JSON.stringify(createBackup(data));
    const r = parseBackup(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.settings.displayName).toBe("Ana");
      expect(r.data.routine.days).toHaveLength(7);
    }
  });

  it("rejeita JSON inválido e estruturas estranhas com mensagem legível", () => {
    expect(parseBackup("{{").ok).toBe(false);
    const r = parseBackup(JSON.stringify({ app: "outro", data: {} }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Backup inválido/);
  });
});

describe("sessão", () => {
  it("cria sessão a partir do dia da rotina com séries vazias", () => {
    const data = createDefaultAppData();
    const s = createSessionFromDay(data.routine.days[0]!, data.exercises);
    expect(s.status).toBe("ativa");
    expect(s.exercises).toHaveLength(7);
    expect(s.exercises[0]?.sets).toHaveLength(3);
    expect(sessionProgress(s).pct).toBe(0);
  });

  it("finaliza marcando exercícios sem séries válidas como ignorados", () => {
    const data = createDefaultAppData();
    const s = createSessionFromDay(data.routine.days[0]!, data.exercises);
    s.exercises[0]!.sets[0] = { ...s.exercises[0]!.sets[0]!, weightKg: 60, reps: 10, completed: true };
    const summary = summarizeForFinish(s);
    expect(summary.completedSets).toBe(1);
    expect(summary.exercisesWithoutSets).toBe(6);
    const f = finalizeSession(s);
    expect(f.status).toBe("concluida");
    expect(f.exercises[0]?.skipped).toBe(false);
    expect(f.exercises.filter((e) => e.skipped)).toHaveLength(6);
  });

  it("aceita duração manual ao finalizar (sessão esquecida aberta)", () => {
    const data = createDefaultAppData();
    const s = createSessionFromDay(data.routine.days[0]!, data.exercises);
    s.startedAt = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(); // aberta há 3 dias
    const auto = finalizeSession(s);
    expect(auto.durationSeconds).toBeGreaterThan(2 * 24 * 3600);
    const fixed = finalizeSession(s, 4, 50 * 60);
    expect(fixed.durationSeconds).toBe(3000);
    expect(fixed.feeling).toBe(4);
    expect(new Date(fixed.finishedAt!).getTime() - new Date(s.startedAt).getTime()).toBe(3000 * 1000);
  });

  it("withDuration recalcula o fim a partir do início e limita o intervalo", () => {
    const data = createDefaultAppData();
    const s = finalizeSession(createSessionFromDay(data.routine.days[0]!, data.exercises));
    const w = withDuration(s, 45 * 60);
    expect(w.durationSeconds).toBe(2700);
    expect(w.startedAt).toBe(s.startedAt);
    expect(new Date(w.finishedAt!).getTime() - new Date(w.startedAt).getTime()).toBe(2700 * 1000);
    expect(withDuration(s, -5).durationSeconds).toBe(0);
    expect(withDuration(s, 99 * 3600).durationSeconds).toBe(600 * 60);
  });
});

describe("unidades e CSV", () => {
  it("converte kg ↔ lb de forma reversível", () => {
    expect(toDisplayWeight(100, "lb")).toBeCloseTo(220.46, 1);
    expect(fromDisplayWeight(toDisplayWeight(60, "lb"), "lb")).toBeCloseTo(60, 1);
    expect(toDisplayWeight(60, "kg")).toBe(60);
  });

  it("gera CSV com uma linha por série", () => {
    const data = createDefaultAppData();
    const s = createSessionFromDay(data.routine.days[0]!, data.exercises);
    s.exercises[0]!.sets[0] = { ...s.exercises[0]!.sets[0]!, weightKg: 60, reps: 10, rir: 2, completed: true };
    const csv = sessionsToCsv([finalizeSession(s)], "kg");
    const lines = csv.split("\r\n");
    const totalSets = s.exercises.reduce((a, e) => a + e.sets.length, 0);
    expect(lines).toHaveLength(totalSets + 1);
    expect(lines[0]).toContain("carga_kg");
    expect(lines[1]).toContain("Supino reto com barra");
    expect(lines[1]).toContain(";600;");
  });
});
