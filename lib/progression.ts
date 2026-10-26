import type { Exercise, SessionExercise, Settings, WorkoutSession } from "@/types";
import { LOWER_BODY } from "./labels";
import { round } from "./utils";
import { roundToIncrement } from "./units";
import { exerciseTotalReps, exerciseVolumeKg, validSets } from "./volume";

/**
 * Progressão dupla: primeiro sobe-se as repetições dentro da faixa prescrita;
 * quando TODAS as séries alcançam o teto da faixa com a carga atual e dentro do
 * RIR planejado, sugere-se um incremento pequeno de carga.
 *
 * As sugestões são informativas. Nunca afirmam que aumentar é obrigatório.
 */

export type SuggestionKind = "sem-historico" | "aumentar" | "manter" | "reduzir";

export interface LoadSuggestion {
  kind: SuggestionKind;
  /** Carga sugerida em kg (null quando não há base). */
  weightKg: number | null;
  /** Carga de trabalho da última sessão. */
  previousWeightKg: number | null;
  incrementKg: number;
  reason: string;
}

export interface PerformanceRef {
  session: WorkoutSession;
  exercise: SessionExercise;
}

/** Última execução concluída de um exercício (com ao menos uma série válida). */
export function lastPerformance(
  sessions: WorkoutSession[],
  exerciseId: string,
  excludeSessionId?: string,
): PerformanceRef | null {
  const sorted = [...sessions]
    .filter((s) => s.status === "concluida" && s.id !== excludeSessionId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const session of sorted) {
    const se = session.exercises.find((e) => e.exerciseId === exerciseId && validSets(e).length > 0);
    if (se) return { session, exercise: se };
  }
  return null;
}

/** Histórico completo (mais recente primeiro) de um exercício. */
export function exerciseHistory(sessions: WorkoutSession[], exerciseId: string): PerformanceRef[] {
  const out: PerformanceRef[] = [];
  const sorted = [...sessions]
    .filter((s) => s.status === "concluida")
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const session of sorted) {
    for (const se of session.exercises) {
      if (se.exerciseId === exerciseId && validSets(se).length > 0) out.push({ session, exercise: se });
    }
  }
  return out;
}

/** Carga de trabalho: a carga mais frequente entre as séries válidas (empate → maior). */
export function workingWeight(se: SessionExercise): number | null {
  const weights = validSets(se)
    .map((s) => s.weightKg)
    .filter((w): w is number => w !== null);
  if (weights.length === 0) return null;
  const counts = new Map<number, number>();
  for (const w of weights) counts.set(w, (counts.get(w) ?? 0) + 1);
  let best = weights[0] ?? 0;
  let bestCount = 0;
  for (const [w, c] of counts) {
    if (c > bestCount || (c === bestCount && w > best)) {
      best = w;
      bestCount = c;
    }
  }
  return best;
}

export function incrementFor(exercise: Pick<Exercise, "primaryMuscle"> | undefined, settings: Settings): number {
  if (!exercise) return settings.incrementUpperKg;
  return LOWER_BODY.has(exercise.primaryMuscle) ? settings.incrementLowerKg : settings.incrementUpperKg;
}

export interface SuggestLoadParams {
  last: SessionExercise | null;
  repMin: number;
  repMax: number;
  targetSets: number;
  exercise: Pick<Exercise, "primaryMuscle" | "measure"> | undefined;
  settings: Settings;
}

export function suggestLoad({ last, repMin, repMax, targetSets, exercise, settings }: SuggestLoadParams): LoadSuggestion {
  const incrementKg = incrementFor(exercise, settings);

  if (exercise?.measure === "time") {
    return {
      kind: last ? "manter" : "sem-historico",
      weightKg: null,
      previousWeightKg: null,
      incrementKg: 0,
      reason: last
        ? `Exercício por tempo: tente manter ou aumentar os segundos dentro da faixa ${repMin}–${repMax}s.`
        : `Exercício por tempo. Registre os segundos de cada série (faixa ${repMin}–${repMax}s).`,
    };
  }

  if (!last) {
    return {
      kind: "sem-historico",
      weightKg: null,
      previousWeightKg: null,
      incrementKg,
      reason: `Sem histórico. Escolha uma carga com a qual você consiga ${repMin}–${repMax} repetições deixando ${settings.defaultRir} em reserva.`,
    };
  }

  const sets = validSets(last);
  const prev = workingWeight(last);
  if (prev === null) {
    return {
      kind: "manter",
      weightKg: null,
      previousWeightKg: null,
      incrementKg,
      reason: "Última sessão sem carga registrada. Registre a carga para receber sugestões.",
    };
  }

  const setsAtWorkingWeight = sets.filter((s) => s.weightKg === prev);
  const reps = setsAtWorkingWeight.map((s) => s.reps ?? 0);
  const rirs = setsAtWorkingWeight.map((s) => s.rir);
  const allReachedTop = reps.length > 0 && reps.every((r) => r >= repMax);
  const enoughSets = setsAtWorkingWeight.length >= targetSets;
  const knownRir = rirs.filter((r): r is number => r !== null);
  const rirOk = knownRir.every((r) => r >= settings.defaultRir);
  const rirTooLow = knownRir.length > 0 && knownRir.some((r) => r < Math.max(0, settings.defaultRir - 1));
  const belowMin = reps.filter((r) => r < repMin).length;

  if (allReachedTop && enoughSets && rirOk) {
    const next = roundToIncrement(prev + incrementKg, incrementKg);
    const rirNote = knownRir.length === 0 ? " (RIR não registrado; considere se a técnica se manteve)" : "";
    return {
      kind: "aumentar",
      weightKg: next,
      previousWeightKg: prev,
      incrementKg,
      reason: `Você fez ${repMax}+ repetições em ${setsAtWorkingWeight.length} série(s) com ${prev} kg dentro do RIR planejado${rirNote}. Um aumento de +${incrementKg} kg é uma opção, se a execução e a recuperação estiverem boas.`,
    };
  }

  if (allReachedTop && enoughSets && !rirOk) {
    return {
      kind: "manter",
      weightKg: prev,
      previousWeightKg: prev,
      incrementKg,
      reason: `Você alcançou ${repMax} repetições, mas com RIR abaixo do planejado (${settings.defaultRir}). Consolide a carga de ${prev} kg antes de subir.`,
    };
  }

  if (belowMin > 0 && belowMin >= Math.ceil(reps.length / 2) && reps.length > 0) {
    const lower = Math.max(0, roundToIncrement(prev - incrementKg, incrementKg));
    return {
      kind: "reduzir",
      weightKg: lower,
      previousWeightKg: prev,
      incrementKg,
      reason: `${belowMin} de ${reps.length} série(s) ficaram abaixo de ${repMin} repetições com ${prev} kg. Considere reduzir para ${lower} kg ou manter e recuperar melhor.`,
    };
  }

  if (rirTooLow) {
    return {
      kind: "manter",
      weightKg: prev,
      previousWeightKg: prev,
      incrementKg,
      reason: `RIR muito baixo na última sessão. Mantenha ${prev} kg e foque em técnica e recuperação.`,
    };
  }

  const minReps = reps.length > 0 ? Math.min(...reps) : 0;
  return {
    kind: "manter",
    weightKg: prev,
    previousWeightKg: prev,
    incrementKg,
    reason: `Mantenha ${prev} kg e tente superar ${minReps} repetições na série mais fraca, mirando ${repMax} em todas.`,
  };
}

/** 1RM estimado (fórmula de Epley). Para 1 repetição retorna a própria carga. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return round(weightKg * (1 + reps / 30), 1);
}

export function bestSetE1RM(se: SessionExercise): number {
  if (se.measure === "time") return 0;
  return validSets(se).reduce((best, s) => Math.max(best, estimate1RM(s.weightKg ?? 0, s.reps ?? 0)), 0);
}

export function topWeight(se: SessionExercise): number | null {
  const ws = validSets(se)
    .map((s) => s.weightKg)
    .filter((w): w is number => w !== null);
  return ws.length ? Math.max(...ws) : null;
}

export interface PerformanceComparison {
  volumeDeltaKg: number;
  volumeDeltaPct: number | null;
  topWeightDeltaKg: number | null;
  repsDelta: number;
  setsDelta: number;
}

export function comparePerformance(current: SessionExercise, previous: SessionExercise): PerformanceComparison {
  const cv = exerciseVolumeKg(current);
  const pv = exerciseVolumeKg(previous);
  const ct = topWeight(current);
  const pt = topWeight(previous);
  return {
    volumeDeltaKg: round(cv - pv, 1),
    volumeDeltaPct: pv > 0 ? round(((cv - pv) / pv) * 100, 1) : null,
    topWeightDeltaKg: ct !== null && pt !== null ? round(ct - pt, 2) : null,
    repsDelta: exerciseTotalReps(current) - exerciseTotalReps(previous),
    setsDelta: validSets(current).length - validSets(previous).length,
  };
}
