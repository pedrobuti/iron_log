import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/data/defaults";
import { DEFAULT_EXERCISES } from "@/data/exercises";
import { comparePerformance, estimate1RM, lastPerformance, suggestLoad, workingWeight } from "@/lib/progression";
import { computePersonalRecords, detectNewRecords } from "@/lib/records";
import { session, sessionExercise, set } from "./helpers";

const supino = DEFAULT_EXERCISES.find((e) => e.id === "supino-reto-barra")!;
const agacho = DEFAULT_EXERCISES.find((e) => e.id === "agachamento-livre")!;
const base = { repMin: 8, repMax: 12, targetSets: 3, settings: DEFAULT_SETTINGS };

describe("progressão dupla", () => {
  it("sem histórico não sugere carga", () => {
    const s = suggestLoad({ ...base, last: null, exercise: supino });
    expect(s.kind).toBe("sem-historico");
    expect(s.weightKg).toBeNull();
  });

  it("sugere aumento quando todas as séries atingem o teto com RIR planejado", () => {
    const last = sessionExercise("supino-reto-barra", [set(60, 12, 2), set(60, 12, 2), set(60, 12, 3)]);
    const s = suggestLoad({ ...base, last, exercise: supino });
    expect(s.kind).toBe("aumentar");
    expect(s.weightKg).toBe(62.5);
    expect(s.incrementKg).toBe(2.5);
  });

  it("usa incremento maior para membros inferiores", () => {
    const last = sessionExercise("agachamento-livre", [set(100, 10, 2), set(100, 10, 2), set(100, 10, 2)]);
    const s = suggestLoad({ ...base, repMin: 6, repMax: 10, last, exercise: agacho });
    expect(s.kind).toBe("aumentar");
    expect(s.weightKg).toBe(105);
  });

  it("mantém quando o teto não foi atingido em todas as séries", () => {
    const last = sessionExercise("supino-reto-barra", [set(60, 12, 2), set(60, 11, 1), set(60, 9, 0)]);
    const s = suggestLoad({ ...base, last, exercise: supino });
    expect(s.kind).toBe("manter");
    expect(s.weightKg).toBe(60);
  });

  it("mantém quando atingiu o teto mas com RIR abaixo do planejado", () => {
    const last = sessionExercise("supino-reto-barra", [set(60, 12, 0), set(60, 12, 0), set(60, 12, 1)]);
    const s = suggestLoad({ ...base, last, exercise: supino });
    expect(s.kind).toBe("manter");
  });

  it("não aumenta quando faltaram séries, mesmo com reps no teto", () => {
    const last = sessionExercise("supino-reto-barra", [set(60, 12, 2), set(60, 12, 2)]);
    const s = suggestLoad({ ...base, last, exercise: supino });
    expect(s.kind).toBe("manter");
  });

  it("sugere reduzir quando a maioria das séries ficou abaixo do mínimo", () => {
    const last = sessionExercise("supino-reto-barra", [set(70, 6, 0), set(70, 5, 0), set(70, 8, 1)]);
    const s = suggestLoad({ ...base, last, exercise: supino });
    expect(s.kind).toBe("reduzir");
    expect(s.weightKg).toBe(67.5);
  });

  it("carga de trabalho é a moda das cargas (empate → maior)", () => {
    expect(workingWeight(sessionExercise("x", [set(60, 10), set(60, 10), set(65, 8)]))).toBe(60);
    expect(workingWeight(sessionExercise("x", [set(60, 10), set(65, 8)]))).toBe(65);
    expect(workingWeight(sessionExercise("x", [set(null, 10)]))).toBeNull();
  });

  it("1RM estimado (Epley)", () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 10)).toBeCloseTo(133.3, 1);
    expect(estimate1RM(0, 10)).toBe(0);
  });

  it("última performance ignora sessões ativas e a sessão atual", () => {
    const s1 = session("2025-01-01T10:00:00.000Z", [sessionExercise("supino-reto-barra", [set(50, 10)])]);
    const s2 = session("2025-01-08T10:00:00.000Z", [sessionExercise("supino-reto-barra", [set(55, 10)])]);
    const active = session("2025-01-15T10:00:00.000Z", [sessionExercise("supino-reto-barra", [set(60, 10)])], { status: "ativa" });
    const last = lastPerformance([s1, s2, active], "supino-reto-barra", active.id);
    expect(last?.session.id).toBe(s2.id);
  });

  it("compara sessões consecutivas", () => {
    const cur = sessionExercise("x", [set(62.5, 10), set(62.5, 10)]);
    const prev = sessionExercise("x", [set(60, 10), set(60, 9)]);
    const c = comparePerformance(cur, prev);
    expect(c.volumeDeltaKg).toBe(110);
    expect(c.topWeightDeltaKg).toBe(2.5);
    expect(c.repsDelta).toBe(1);
  });
});

describe("recordes", () => {
  it("calcula carga máxima, e1RM e volume por sessão", () => {
    const s1 = session("2025-01-01T10:00:00.000Z", [sessionExercise("supino-reto-barra", [set(60, 10), set(60, 10)])]);
    const s2 = session("2025-01-08T10:00:00.000Z", [sessionExercise("supino-reto-barra", [set(65, 8), set(65, 8), set(65, 8)])]);
    const recs = computePersonalRecords([s1, s2]);
    expect(recs).toHaveLength(1);
    expect(recs[0]?.maxWeightKg).toBe(65);
    expect(recs[0]?.bestSessionVolumeKg).toBe(1560);
    expect(recs[0]?.bestE1rmKg).toBeCloseTo(82.3, 1);
  });

  it("detecta novos recordes em relação às sessões anteriores", () => {
    const s1 = session("2025-01-01T10:00:00.000Z", [sessionExercise("supino-reto-barra", [set(60, 10)])]);
    const s2 = session("2025-01-08T10:00:00.000Z", [sessionExercise("supino-reto-barra", [set(62.5, 10)])]);
    const news = detectNewRecords(s2, [s1, s2]);
    expect(news.map((n) => n.type).sort()).toEqual(["carga", "e1rm", "volume"]);
    expect(detectNewRecords(s1, [s1, s2])).toHaveLength(0);
  });
});
