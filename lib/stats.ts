import { addDays, differenceInCalendarDays, isWithinInterval, parseISO, startOfDay, subWeeks } from "date-fns";
import type { Routine, Settings, Weekday, WorkoutSession } from "@/types";
import { endOfTrainingWeek, isoWeekday, startOfTrainingWeek, toDateKey, formatDayMonth } from "./dates";
import { bestSetE1RM, topWeight } from "./progression";
import { average, round } from "./utils";
import { exerciseTotalReps, exerciseVolumeKg, sessionEffectiveSets, sessionVolumeKg, validSets } from "./volume";

export function completedSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((s) => s.status === "concluida").sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export function sessionsInRange(sessions: WorkoutSession[], start: Date, end: Date): WorkoutSession[] {
  return completedSessions(sessions).filter((s) => isWithinInterval(parseISO(s.startedAt), { start, end }));
}

export function lastCompletedSession(sessions: WorkoutSession[]): WorkoutSession | null {
  const list = completedSessions(sessions);
  return list.length ? (list[list.length - 1] ?? null) : null;
}

export interface WeekSummary {
  start: Date;
  end: Date;
  label: string;
  sessions: number;
  volumeKg: number;
  sets: number;
  reps: number;
  totalDurationMin: number;
  avgDurationMin: number;
}

export function summarizeRange(sessions: WorkoutSession[], start: Date, end: Date): WeekSummary {
  const list = sessionsInRange(sessions, start, end);
  const durations = list.map((s) => s.durationSeconds / 60);
  return {
    start,
    end,
    label: `${formatDayMonth(start)} – ${formatDayMonth(addDays(start, 6))}`,
    sessions: list.length,
    volumeKg: round(list.reduce((a, s) => a + sessionVolumeKg(s), 0), 1),
    sets: list.reduce((a, s) => a + sessionEffectiveSets(s), 0),
    reps: list.reduce((a, s) => a + s.exercises.reduce((b, e) => b + exerciseTotalReps(e), 0), 0),
    totalDurationMin: round(durations.reduce((a, b) => a + b, 0), 0),
    avgDurationMin: round(average(durations), 0),
  };
}

export function currentWeekSummary(sessions: WorkoutSession[], weekStartsOn: Weekday, now: Date = new Date()): WeekSummary {
  return summarizeRange(sessions, startOfTrainingWeek(now, weekStartsOn), endOfTrainingWeek(now, weekStartsOn));
}

/** Últimas N semanas (da mais antiga para a atual). */
export function weeklySeries(sessions: WorkoutSession[], weeks: number, weekStartsOn: Weekday, now: Date = new Date()): WeekSummary[] {
  const out: WeekSummary[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ref = subWeeks(now, i);
    out.push(summarizeRange(sessions, startOfTrainingWeek(ref, weekStartsOn), endOfTrainingWeek(ref, weekStartsOn)));
  }
  return out;
}

export function averageDurationMin(sessions: WorkoutSession[]): number {
  const list = completedSessions(sessions);
  return round(average(list.map((s) => s.durationSeconds / 60)), 0);
}

export function totalEffectiveSets(sessions: WorkoutSession[]): number {
  return completedSessions(sessions).reduce((a, s) => a + sessionEffectiveSets(s), 0);
}

/**
 * Sequência: quantos dias de treino PROGRAMADOS consecutivos (segundo a rotina)
 * foram cumpridos, contando para trás a partir de hoje. Dias de descanso não
 * quebram a sequência. Hoje só conta se já houver sessão concluída; caso contrário
 * é ignorado (a sequência ainda está "viva").
 */
export function trainingStreak(sessions: WorkoutSession[], routine: Routine, now: Date = new Date()): number {
  const byDay = sessionsByDateKey(sessions);
  const trainingWeekdays = new Set(routine.days.filter((d) => d.type === "treino").map((d) => d.weekday));
  if (trainingWeekdays.size === 0) return 0;
  let streak = 0;
  let cursor = startOfDay(now);
  const todayKey = toDateKey(cursor);
  const todayHasSession = byDay.has(todayKey);
  if (!todayHasSession) cursor = addDays(cursor, -1);
  for (let i = 0; i < 365; i++) {
    const wd = isoWeekday(cursor);
    const key = toDateKey(cursor);
    if (trainingWeekdays.has(wd)) {
      if (byDay.has(key)) streak++;
      else break;
    } else if (byDay.has(key)) {
      // treinou em dia de descanso: conta como bônus, não quebra
      streak++;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function sessionsByDateKey(sessions: WorkoutSession[]): Map<string, WorkoutSession[]> {
  const map = new Map<string, WorkoutSession[]>();
  for (const s of completedSessions(sessions)) {
    const key = toDateKey(parseISO(s.startedAt));
    const list = map.get(key);
    if (list) list.push(s);
    else map.set(key, [s]);
  }
  return map;
}

export interface ExerciseProgressPoint {
  date: string;
  sessionId: string;
  topWeightKg: number | null;
  e1rmKg: number;
  volumeKg: number;
  totalReps: number;
  sets: number;
}

export function exerciseProgressSeries(sessions: WorkoutSession[], exerciseId: string): ExerciseProgressPoint[] {
  const out: ExerciseProgressPoint[] = [];
  for (const s of completedSessions(sessions)) {
    for (const se of s.exercises) {
      if (se.exerciseId !== exerciseId || validSets(se).length === 0) continue;
      out.push({
        date: s.startedAt,
        sessionId: s.id,
        topWeightKg: topWeight(se),
        e1rmKg: bestSetE1RM(se),
        volumeKg: round(exerciseVolumeKg(se), 1),
        totalReps: exerciseTotalReps(se),
        sets: validSets(se).length,
      });
    }
  }
  return out;
}

export function frequencyTarget(settings: Settings, routine: Routine): number {
  const routineDays = routine.days.filter((d) => d.type === "treino").length;
  return routineDays > 0 ? routineDays : settings.trainingDays.length;
}

/** Dias desde a última sessão concluída (null se nunca treinou). */
export function daysSinceLastSession(sessions: WorkoutSession[], now: Date = new Date()): number | null {
  const last = lastCompletedSession(sessions);
  return last ? differenceInCalendarDays(now, parseISO(last.startedAt)) : null;
}
