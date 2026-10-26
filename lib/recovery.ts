import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Exercise, MuscleGroup, Routine, RoutineDay, WorkoutSession } from "@/types";
import { MUSCLE_GROUPS } from "@/types";
import { WEEKDAY_SHORT, daysAgo, hoursSince, nextOccurrenceAfterToday, isoWeekday } from "./dates";
import { MUSCLE_LABELS } from "./labels";
import { muscleLoadForSession, muscleLoadForSessions, musclesOf, plannedMuscleSets, validSets } from "./volume";

/**
 * Indicadores de recuperação são ESTIMATIVAS informativas calculadas a partir
 * do tempo desde o último estímulo registrado e do volume recente.
 * Não são medições fisiológicas nem orientação médica.
 */

export const RECOVERY_DISCLAIMER =
  "Estes indicadores são estimativas baseadas apenas nos seus registros de treino. " +
  "O tempo decorrido não garante recuperação completa: 24 horas raramente bastam após uma sessão exigente, " +
  "e a recuperação real depende de sono, alimentação, estresse e do volume acumulado. Não são medições fisiológicas.";

export const RECOVERY_TIPS: string[] = [
  "Observe a dor muscular tardia: dor intensa ao toque ou que limita a amplitude sugere esperar mais.",
  "Compare o desempenho: se as cargas ou repetições caem em relação à sessão anterior, a recuperação pode estar incompleta.",
  "Avalie a qualidade do movimento no aquecimento. Técnica instável ou rigidez são sinais para reduzir o volume.",
  "Fadiga geral, sono ruim e irritabilidade também afetam a recuperação, mesmo com músculos sem dor.",
  "Articulações e tendões recuperam-se mais lentamente do que o músculo. Dores articulares merecem atenção.",
];

/** Séries diretas em um dia a partir das quais uma sessão é considerada exigente para o músculo. */
export const DEMANDING_DIRECT_SETS = 4;

export type RecoveryLevel = "sem-registro" | "recente" | "intermediario" | "provavel" | "longo";

export const RECOVERY_LEVEL_LABEL: Record<RecoveryLevel, string> = {
  "sem-registro": "Sem registro",
  recente: "Estímulo há menos de 24h",
  intermediario: "24–48h desde o estímulo",
  provavel: "48–72h desde o estímulo",
  longo: "Mais de 72h desde o estímulo",
};

export interface ScheduledStimulus {
  date: Date;
  dayName: string;
  role: "direta" | "indireta";
  plannedSets: number;
}

export interface MuscleRecovery {
  muscle: MuscleGroup;
  label: string;
  lastStimulusAt: string | null;
  lastStimulusRole: "direta" | "indireta" | null;
  lastSessionName: string | null;
  lastSessionSets: number;
  hoursSince: number | null;
  level: RecoveryLevel;
  levelLabel: string;
  /** Séries ponderadas nos últimos 7 dias */
  recentSets7d: number;
  recentTonnage7dKg: number;
  nextScheduled: ScheduledStimulus | null;
  warnings: string[];
}

export function levelFromHours(hours: number | null): RecoveryLevel {
  if (hours === null) return "sem-registro";
  if (hours < 24) return "recente";
  if (hours < 48) return "intermediario";
  if (hours < 72) return "provavel";
  return "longo";
}

/** Para cada dia da rotina, quais músculos ele estimula e com quantas séries diretas. */
export function routineMuscleMap(
  routine: Routine,
  exercisesById: Map<string, Exercise>,
): Map<string, Map<MuscleGroup, { role: "direta" | "indireta"; sets: number }>> {
  const out = new Map<string, Map<MuscleGroup, { role: "direta" | "indireta"; sets: number }>>();
  for (const day of routine.days) {
    const m = new Map<MuscleGroup, { role: "direta" | "indireta"; sets: number }>();
    const planned = plannedMuscleSets(day.prescriptions, exercisesById);
    for (const [muscle, load] of planned) {
      m.set(muscle, {
        role: load.directSets > 0 ? "direta" : "indireta",
        sets: load.directSets > 0 ? load.directSets : load.indirectSets,
      });
    }
    out.set(day.id, m);
  }
  return out;
}

function nextScheduledFor(
  muscle: MuscleGroup,
  routine: Routine,
  dayMap: ReturnType<typeof routineMuscleMap>,
  now: Date,
): ScheduledStimulus | null {
  let best: ScheduledStimulus | null = null;
  for (const day of routine.days) {
    if (day.type !== "treino") continue;
    const info = dayMap.get(day.id)?.get(muscle);
    if (!info) continue;
    const date = nextOccurrenceAfterToday(day.weekday, now);
    if (!best || date < best.date) {
      best = { date, dayName: day.name, role: info.role, plannedSets: info.sets };
    }
  }
  return best;
}

function consecutiveRoutineWarning(
  muscle: MuscleGroup,
  routine: Routine,
  dayMap: ReturnType<typeof routineMuscleMap>,
): string | null {
  const byWeekday = new Map<number, RoutineDay>();
  for (const d of routine.days) byWeekday.set(d.weekday, d);
  for (let w = 1; w <= 7; w++) {
    const a = byWeekday.get(w);
    const b = byWeekday.get(w === 7 ? 1 : w + 1);
    if (!a || !b || a.type !== "treino" || b.type !== "treino") continue;
    const la = dayMap.get(a.id)?.get(muscle);
    const lb = dayMap.get(b.id)?.get(muscle);
    if (la?.role === "direta" && lb?.role === "direta" && la.sets >= DEMANDING_DIRECT_SETS && lb.sets >= DEMANDING_DIRECT_SETS) {
      return `A rotina programa ${MUSCLE_LABELS[muscle]} com trabalho direto exigente em dias consecutivos (${WEEKDAY_SHORT[a.weekday as 1]} e ${WEEKDAY_SHORT[b.weekday as 1]}).`;
    }
  }
  return null;
}

function consecutiveHistoryWarning(
  muscle: MuscleGroup,
  recent: WorkoutSession[],
  exercisesById: Map<string, Exercise>,
): string | null {
  const demandingDays: { date: Date; name: string }[] = [];
  for (const s of recent) {
    const load = muscleLoadForSession(s, exercisesById).get(muscle);
    if (load && load.directSets >= DEMANDING_DIRECT_SETS) {
      demandingDays.push({ date: parseISO(s.startedAt), name: s.dayName });
    }
  }
  demandingDays.sort((a, b) => a.date.getTime() - b.date.getTime());
  for (let i = 1; i < demandingDays.length; i++) {
    const prev = demandingDays[i - 1];
    const cur = demandingDays[i];
    if (prev && cur && differenceInCalendarDays(cur.date, prev.date) === 1) {
      return `${MUSCLE_LABELS[muscle]} recebeu sessões exigentes em dias consecutivos (${prev.name} e ${cur.name}) nos últimos 7 dias.`;
    }
  }
  return null;
}

export interface RecoveryParams {
  sessions: WorkoutSession[];
  routine: Routine;
  exercises: Exercise[];
  now?: Date;
}

export function computeRecovery({ sessions, routine, exercises, now = new Date() }: RecoveryParams): MuscleRecovery[] {
  const exercisesById = new Map(exercises.map((e) => [e.id, e]));
  const completed = sessions
    .filter((s) => s.status === "concluida")
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const since7 = daysAgo(7, now);
  const recent = completed.filter((s) => parseISO(s.startedAt) >= since7);
  const recentLoad = muscleLoadForSessions(recent, exercisesById);
  const dayMap = routineMuscleMap(routine, exercisesById);

  return MUSCLE_GROUPS.map((muscle) => {
    let lastStimulusAt: string | null = null;
    let lastRole: "direta" | "indireta" | null = null;
    let lastName: string | null = null;
    let lastSets = 0;

    for (const s of completed) {
      let role: "direta" | "indireta" | null = null;
      let count = 0;
      for (const se of s.exercises) {
        const ex = exercisesById.get(se.exerciseId);
        if (!ex) continue;
        const inv = musclesOf(ex).find((m) => m.muscle === muscle);
        if (!inv) continue;
        const n = validSets(se).length;
        if (n === 0) continue;
        count += n;
        if (inv.role === "direta") role = "direta";
        else if (role === null) role = "indireta";
      }
      if (role) {
        lastStimulusAt = s.finishedAt ?? s.startedAt;
        lastRole = role;
        lastName = s.dayName;
        lastSets = count;
        break;
      }
    }

    const hours = lastStimulusAt ? hoursSince(lastStimulusAt, now) : null;
    const level = levelFromHours(hours);
    const load = recentLoad.get(muscle);
    const warnings: string[] = [];
    const w1 = consecutiveHistoryWarning(muscle, recent, exercisesById);
    const w2 = consecutiveRoutineWarning(muscle, routine, dayMap);
    if (w1) warnings.push(w1);
    if (w2) warnings.push(w2);

    const next = nextScheduledFor(muscle, routine, dayMap, now);
    if (next && hours !== null && hours < 24 && next.role === "direta" && differenceInCalendarDays(next.date, now) === 1) {
      warnings.push(`Próximo estímulo direto amanhã (${next.dayName}), menos de 48h após o último registro.`);
    }

    return {
      muscle,
      label: MUSCLE_LABELS[muscle],
      lastStimulusAt,
      lastStimulusRole: lastRole,
      lastSessionName: lastName,
      lastSessionSets: lastSets,
      hoursSince: hours,
      level,
      levelLabel: RECOVERY_LEVEL_LABEL[level],
      recentSets7d: load?.sets ?? 0,
      recentTonnage7dKg: load?.tonnageKg ?? 0,
      nextScheduled: next,
      warnings,
    };
  });
}

/** Músculos trabalhados hoje pela rotina (para destaque no dashboard). */
export function musclesScheduledToday(routine: Routine, exercises: Exercise[], now: Date = new Date()): MuscleGroup[] {
  const day = routine.days.find((d) => d.weekday === isoWeekday(now));
  if (!day || day.type !== "treino") return [];
  const exercisesById = new Map(exercises.map((e) => [e.id, e]));
  const planned = plannedMuscleSets(day.prescriptions, exercisesById);
  return [...planned.entries()].filter(([, l]) => l.directSets > 0).map(([m]) => m);
}
