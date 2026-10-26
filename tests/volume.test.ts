import { describe, expect, it } from "vitest";
import { DEFAULT_EXERCISES } from "@/data/exercises";
import { exerciseVolumeKg, isValidSet, muscleLoadForSession, sessionEffectiveSets, sessionVolumeKg, setVolumeKg } from "@/lib/volume";
import { session, sessionExercise, set } from "./helpers";

const byId = new Map(DEFAULT_EXERCISES.map((e) => [e.id, e]));

describe("volume", () => {
  it("série válida exige conclusão e repetições > 0", () => {
    expect(isValidSet(set(60, 10))).toBe(true);
    expect(isValidSet(set(60, 10, 2, false))).toBe(false);
    expect(isValidSet(set(60, 0))).toBe(false);
    expect(isValidSet(set(60, null))).toBe(false);
  });

  it("volume = carga × reps; carga ausente conta 0 mas a série continua efetiva", () => {
    const se = sessionExercise("supino-reto-barra", [set(60, 10), set(null, 12), set(60, 8, 2, false)]);
    expect(exerciseVolumeKg(se)).toBe(600);
    expect(sessionEffectiveSets(session("2025-01-06T10:00:00.000Z", [se]))).toBe(2);
  });

  it("unilateral multiplica por 2 lados", () => {
    const se = sessionExercise("remada-unilateral-polia", [set(20, 10)], { isUnilateral: true });
    expect(setVolumeKg(se.sets[0]!, se)).toBe(400);
  });

  it("exercício por tempo não gera tonelagem", () => {
    const se = sessionExercise("prancha", [set(null, 45)], { measure: "time" });
    expect(exerciseVolumeKg(se)).toBe(0);
    expect(isValidSet(se.sets[0]!)).toBe(true);
  });

  it("volume por músculo pondera direta 1,0 e indireta 0,5", () => {
    const s = session("2025-01-06T10:00:00.000Z", [
      sessionExercise("supino-reto-barra", [set(60, 10), set(60, 10)]), // peito direto; tríceps/ombros indireto
      sessionExercise("triceps-corda-polia", [set(20, 12)]), // tríceps direto
    ]);
    const load = muscleLoadForSession(s, byId);
    expect(load.get("peito")?.sets).toBe(2);
    expect(load.get("peito")?.tonnageKg).toBe(1200);
    expect(load.get("triceps")?.sets).toBe(2); // 1 direta + 2×0,5 indiretas
    expect(load.get("triceps")?.directSets).toBe(1);
    expect(load.get("triceps")?.indirectSets).toBe(2);
    expect(load.get("ombros")?.sets).toBe(1);
    expect(sessionVolumeKg(s)).toBe(1440);
  });
});
