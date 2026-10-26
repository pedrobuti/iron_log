import { describe, expect, it } from "vitest";
import { createDefaultRoutine } from "@/data/routine";
import { DEFAULT_EXERCISES } from "@/data/exercises";
import { currentWeekSummary, exerciseProgressSeries, trainingStreak, weeklySeries } from "@/lib/stats";
import { computeRecovery, levelFromHours } from "@/lib/recovery";
import { session, sessionExercise, set } from "./helpers";

// Quarta-feira 2025-01-15 ao meio-dia (horário local)
const NOW = new Date(2025, 0, 15, 12, 0, 0);
const routine = createDefaultRoutine();

function local(y: number, m: number, d: number, h = 10): string {
  return new Date(y, m - 1, d, h).toISOString();
}

describe("estatísticas semanais", () => {
  it("resume a semana atual (segunda a domingo)", () => {
    const sessions = [
      session(local(2025, 1, 13), [sessionExercise("supino-reto-barra", [set(60, 10)])], { durationSeconds: 3000 }),
      session(local(2025, 1, 14), [sessionExercise("puxada-alta-frente", [set(50, 10), set(50, 10)])], { durationSeconds: 3600 }),
      session(local(2025, 1, 10), [sessionExercise("leg-press", [set(100, 10)])]), // semana anterior
    ];
    const w = currentWeekSummary(sessions, 1, NOW);
    expect(w.sessions).toBe(2);
    expect(w.volumeKg).toBe(1600);
    expect(w.sets).toBe(3);
    expect(w.avgDurationMin).toBe(55);
  });

  it("gera série de semanas da mais antiga para a atual", () => {
    const sessions = [session(local(2025, 1, 6), [sessionExercise("x", [set(10, 10)])])];
    const weeks = weeklySeries(sessions, 3, 1, NOW);
    expect(weeks).toHaveLength(3);
    expect(weeks[1]?.sessions).toBe(1);
    expect(weeks[2]?.sessions).toBe(0);
  });

  it("sequência conta dias programados cumpridos, ignorando descanso e hoje sem treino", () => {
    // Rotina: treino seg, ter, qua, sex, sáb. Hoje quarta sem treino ainda.
    const sessions = [
      session(local(2025, 1, 10), [sessionExercise("x", [set(10, 10)])]), // sexta
      session(local(2025, 1, 11), [sessionExercise("x", [set(10, 10)])]), // sábado
      // domingo descanso (ignorado)
      session(local(2025, 1, 13), [sessionExercise("x", [set(10, 10)])]), // segunda
      session(local(2025, 1, 14), [sessionExercise("x", [set(10, 10)])]), // terça
    ];
    expect(trainingStreak(sessions, routine, NOW)).toBe(4);
    // Quebra: faltou a segunda
    const broken = sessions.filter((s) => !s.startedAt.startsWith("2025-01-13"));
    expect(trainingStreak(broken, routine, NOW)).toBe(1);
  });

  it("série de progresso por exercício", () => {
    const sessions = [
      session(local(2025, 1, 6), [sessionExercise("supino-reto-barra", [set(60, 10), set(60, 9)])]),
      session(local(2025, 1, 13), [sessionExercise("supino-reto-barra", [set(62.5, 10)])]),
    ];
    const pts = exerciseProgressSeries(sessions, "supino-reto-barra");
    expect(pts).toHaveLength(2);
    expect(pts[0]?.topWeightKg).toBe(60);
    expect(pts[0]?.volumeKg).toBe(1140);
    expect(pts[1]?.topWeightKg).toBe(62.5);
  });
});

describe("recuperação", () => {
  it("classifica por horas desde o estímulo", () => {
    expect(levelFromHours(null)).toBe("sem-registro");
    expect(levelFromHours(10)).toBe("recente");
    expect(levelFromHours(30)).toBe("intermediario");
    expect(levelFromHours(60)).toBe("provavel");
    expect(levelFromHours(100)).toBe("longo");
  });

  it("registra último estímulo direto/indireto e volume recente", () => {
    const sessions = [session(local(2025, 1, 14, 10), [sessionExercise("supino-reto-barra", [set(60, 10), set(60, 10)])])];
    const rec = computeRecovery({ sessions, routine, exercises: DEFAULT_EXERCISES, now: NOW });
    const peito = rec.find((r) => r.muscle === "peito")!;
    const triceps = rec.find((r) => r.muscle === "triceps")!;
    expect(peito.lastStimulusRole).toBe("direta");
    expect(peito.hoursSince).toBeCloseTo(26, 0);
    expect(peito.level).toBe("intermediario");
    expect(peito.recentSets7d).toBe(2);
    expect(triceps.lastStimulusRole).toBe("indireta");
    expect(triceps.recentSets7d).toBe(1);
    expect(rec.find((r) => r.muscle === "quadriceps")?.level).toBe("sem-registro");
  });

  it("avisa sobre sessões exigentes em dias consecutivos no histórico", () => {
    const heavy = () => sessionExercise("supino-reto-barra", [set(60, 10), set(60, 10), set(60, 10), set(60, 10)]);
    const sessions = [session(local(2025, 1, 13), [heavy()]), session(local(2025, 1, 14), [heavy()])];
    const peito = computeRecovery({ sessions, routine, exercises: DEFAULT_EXERCISES, now: NOW }).find((r) => r.muscle === "peito")!;
    expect(peito.warnings.some((w) => w.includes("dias consecutivos"))).toBe(true);
  });
});
