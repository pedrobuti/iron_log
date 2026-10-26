import type { SessionExercise, SetLog, WorkoutSession } from "@/types";

let counter = 0;
const id = () => `t-${++counter}`;

export function set(weightKg: number | null, reps: number | null, rir: number | null = 2, completed = true): SetLog {
  return { id: id(), weightKg, reps, rir, completed, isExtra: false };
}

export function sessionExercise(exerciseId: string, sets: SetLog[], extra: Partial<SessionExercise> = {}): SessionExercise {
  return {
    id: id(),
    exerciseId,
    exerciseName: exerciseId,
    targetSets: 3,
    repMin: 8,
    repMax: 12,
    restSeconds: 90,
    measure: "reps",
    isUnilateral: false,
    sets,
    notes: "",
    skipped: false,
    ...extra,
  };
}

export function session(startedAt: string, exercises: SessionExercise[], extra: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: id(),
    routineDayId: "day-1",
    dayName: "Push",
    weekday: 1,
    startedAt,
    finishedAt: startedAt,
    durationSeconds: 3600,
    exercises,
    notes: "",
    status: "concluida",
    ...extra,
  };
}
