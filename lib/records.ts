import type { PersonalRecord, WorkoutSession } from "@/types";
import { estimate1RM } from "./progression";
import { exerciseVolumeKg, validSets } from "./volume";

/** Recordes pessoais por exercício a partir das sessões concluídas. */
export function computePersonalRecords(sessions: WorkoutSession[]): PersonalRecord[] {
  const map = new Map<string, PersonalRecord>();
  for (const session of sessions) {
    if (session.status !== "concluida") continue;
    for (const se of session.exercises) {
      if (se.measure === "time") continue;
      const sets = validSets(se).filter((s) => s.weightKg !== null && (s.weightKg ?? 0) > 0);
      if (sets.length === 0) continue;
      const date = session.finishedAt ?? session.startedAt;
      const current = map.get(se.exerciseId) ?? {
        exerciseId: se.exerciseId,
        exerciseName: se.exerciseName,
        maxWeightKg: 0,
        maxWeightReps: 0,
        maxWeightDate: date,
        bestE1rmKg: 0,
        bestE1rmDate: date,
        bestSessionVolumeKg: 0,
        bestSessionVolumeDate: date,
      };
      current.exerciseName = se.exerciseName;
      for (const s of sets) {
        const w = s.weightKg ?? 0;
        const r = s.reps ?? 0;
        if (w > current.maxWeightKg || (w === current.maxWeightKg && r > current.maxWeightReps)) {
          current.maxWeightKg = w;
          current.maxWeightReps = r;
          current.maxWeightDate = date;
        }
        const e1 = estimate1RM(w, r);
        if (e1 > current.bestE1rmKg) {
          current.bestE1rmKg = e1;
          current.bestE1rmDate = date;
        }
      }
      const vol = exerciseVolumeKg(se);
      if (vol > current.bestSessionVolumeKg) {
        current.bestSessionVolumeKg = vol;
        current.bestSessionVolumeDate = date;
      }
      map.set(se.exerciseId, current);
    }
  }
  return [...map.values()].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, "pt-BR"));
}

export interface NewRecord {
  exerciseId: string;
  exerciseName: string;
  type: "carga" | "e1rm" | "volume";
  value: number;
  previous: number;
}

/** Compara uma sessão com os recordes anteriores a ela e lista novos recordes. */
export function detectNewRecords(session: WorkoutSession, allSessions: WorkoutSession[]): NewRecord[] {
  const previous = computePersonalRecords(allSessions.filter((s) => s.id !== session.id && s.startedAt < session.startedAt));
  const prevMap = new Map(previous.map((r) => [r.exerciseId, r]));
  const current = computePersonalRecords([session]);
  const out: NewRecord[] = [];
  for (const rec of current) {
    const prev = prevMap.get(rec.exerciseId);
    if (!prev) continue; // primeira vez: não é "quebra" de recorde
    if (rec.maxWeightKg > prev.maxWeightKg) {
      out.push({ exerciseId: rec.exerciseId, exerciseName: rec.exerciseName, type: "carga", value: rec.maxWeightKg, previous: prev.maxWeightKg });
    }
    if (rec.bestE1rmKg > prev.bestE1rmKg) {
      out.push({ exerciseId: rec.exerciseId, exerciseName: rec.exerciseName, type: "e1rm", value: rec.bestE1rmKg, previous: prev.bestE1rmKg });
    }
    if (rec.bestSessionVolumeKg > prev.bestSessionVolumeKg) {
      out.push({ exerciseId: rec.exerciseId, exerciseName: rec.exerciseName, type: "volume", value: rec.bestSessionVolumeKg, previous: prev.bestSessionVolumeKg });
    }
  }
  return out;
}
