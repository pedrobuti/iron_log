import type { Exercise, Prescription, RoutineDay, SessionExercise, SetLog, Settings, WorkoutSession } from "@/types";
import { nowIso, isoWeekday } from "./dates";
import { createId } from "./id";
import { isValidSet } from "./volume";

export function createSet(partial: Partial<SetLog> = {}): SetLog {
  return {
    id: createId(),
    weightKg: null,
    reps: null,
    rir: null,
    completed: false,
    isExtra: false,
    ...partial,
  };
}

export function createSessionExercise(
  exercise: Exercise,
  prescription: Pick<Prescription, "sets" | "repMin" | "repMax" | "restSeconds" | "notes"> & { id?: string },
): SessionExercise {
  return {
    id: createId(),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    prescriptionId: prescription.id,
    targetSets: prescription.sets,
    repMin: prescription.repMin,
    repMax: prescription.repMax,
    restSeconds: prescription.restSeconds,
    measure: exercise.measure,
    isUnilateral: exercise.isUnilateral,
    sets: Array.from({ length: prescription.sets }, () => createSet()),
    notes: "",
    skipped: false,
  };
}

/** Cria uma sessão a partir de um dia da rotina. Exercícios ausentes na biblioteca são ignorados. */
export function createSessionFromDay(day: RoutineDay, exercises: Exercise[]): WorkoutSession {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const sessionExercises: SessionExercise[] = [];
  for (const p of day.prescriptions) {
    const ex = byId.get(p.exerciseId);
    if (!ex) continue;
    sessionExercises.push(createSessionExercise(ex, p));
  }
  const now = new Date();
  return {
    id: createId(),
    routineDayId: day.id,
    dayName: day.name,
    weekday: day.weekday,
    startedAt: now.toISOString(),
    finishedAt: null,
    durationSeconds: 0,
    exercises: sessionExercises,
    notes: "",
    status: "ativa",
  };
}

/** Sessão livre (sem dia da rotina), útil para treinar em dia de descanso. */
export function createFreeSession(name: string): WorkoutSession {
  const now = new Date();
  return {
    id: createId(),
    routineDayId: null,
    dayName: name,
    weekday: isoWeekday(now),
    startedAt: now.toISOString(),
    finishedAt: null,
    durationSeconds: 0,
    exercises: [],
    notes: "",
    status: "ativa",
  };
}

export function elapsedSeconds(session: WorkoutSession, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(session.startedAt).getTime()) / 1000));
}

export interface FinishSummary {
  completedSets: number;
  plannedSets: number;
  skippedExercises: number;
  exercisesWithoutSets: number;
}

export function summarizeForFinish(session: WorkoutSession): FinishSummary {
  let completedSets = 0;
  let plannedSets = 0;
  let skippedExercises = 0;
  let exercisesWithoutSets = 0;
  for (const se of session.exercises) {
    plannedSets += se.targetSets;
    const valid = se.sets.filter(isValidSet).length;
    completedSets += valid;
    if (se.skipped) skippedExercises++;
    else if (valid === 0) exercisesWithoutSets++;
  }
  return { completedSets, plannedSets, skippedExercises, exercisesWithoutSets };
}

/** Sessões abertas por mais que isso provavelmente foram esquecidas: pedimos a duração real. */
export const LONG_SESSION_SECONDS = 3 * 3600;
export const MAX_SESSION_MINUTES = 600;

/** Aplica uma duração informada manualmente, mantendo o início e recalculando o fim. */
export function withDuration(session: WorkoutSession, durationSeconds: number): WorkoutSession {
  const secs = Math.max(0, Math.min(MAX_SESSION_MINUTES * 60, Math.round(durationSeconds)));
  const finishedAt = new Date(new Date(session.startedAt).getTime() + secs * 1000).toISOString();
  return { ...session, durationSeconds: secs, finishedAt };
}

/**
 * Finaliza a sessão: marca exercícios sem séries válidas como ignorados e fixa a duração.
 * `durationSeconds` substitui o tempo decorrido (sessão esquecida aberta).
 */
export function finalizeSession(session: WorkoutSession, feeling?: number, durationSeconds?: number): WorkoutSession {
  const finishedAt = nowIso();
  const base = {
    ...session,
    status: "concluida" as const,
    finishedAt,
    durationSeconds: elapsedSeconds(session, new Date(finishedAt)),
  };
  const timed = durationSeconds !== undefined ? withDuration(base, durationSeconds) : base;
  return {
    ...timed,
    feeling,
    exercises: session.exercises.map((se) => ({
      ...se,
      skipped: se.skipped || se.sets.filter(isValidSet).length === 0,
    })),
  };
}

export function sessionProgress(session: WorkoutSession): { done: number; total: number; pct: number } {
  let done = 0;
  let total = 0;
  for (const se of session.exercises) {
    if (se.skipped) continue;
    total += se.sets.length;
    done += se.sets.filter((s) => s.completed).length;
  }
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function defaultRestFor(se: SessionExercise, settings: Settings): number {
  return se.restSeconds > 0 ? se.restSeconds : settings.defaultRestSeconds;
}
