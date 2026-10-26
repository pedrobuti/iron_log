import type { Exercise, Measure, MuscleGroup, MuscleInvolvement, SessionExercise, SetLog, WorkoutSession } from "@/types";

/**
 * CONVENÇÃO DE VOLUME (documentada também no README):
 *
 * - Série válida: marcada como concluída e com repetições (ou segundos) > 0.
 * - Volume (tonelagem) de uma série = carga (kg) × repetições.
 *   • Se a carga não foi informada (ex.: peso corporal), conta 0 kg de tonelagem,
 *     mas a série ainda é contabilizada como "série efetiva".
 *   • Exercícios medidos por tempo (ex.: prancha) não geram tonelagem.
 * - Exercícios UNILATERAIS: uma série registrada representa os DOIS lados
 *   executados com a carga indicada por lado. As repetições são por lado.
 *   A tonelagem é multiplicada por 2 (carga × reps × 2 lados).
 * - Volume por grupo muscular: cada série válida conta 1,0 para o músculo
 *   principal (participação direta) e 0,5 para cada músculo auxiliar
 *   (participação indireta). O mesmo fator pondera a tonelagem.
 *
 * Volume externo é uma medida de trabalho mecânico, não uma medida de hipertrofia.
 */

export const DIRECT_WEIGHT = 1;
export const INDIRECT_WEIGHT = 0.5;

export interface ExerciseLike {
  measure: Measure;
  isUnilateral: boolean;
}

export function isValidSet(set: SetLog): boolean {
  return set.completed && set.reps !== null && set.reps > 0;
}

export function setVolumeKg(set: SetLog, ex: ExerciseLike): number {
  if (!isValidSet(set)) return 0;
  if (ex.measure === "time") return 0;
  const weight = set.weightKg ?? 0;
  const reps = set.reps ?? 0;
  const sides = ex.isUnilateral ? 2 : 1;
  return weight * reps * sides;
}

export function validSets(se: SessionExercise): SetLog[] {
  return se.sets.filter(isValidSet);
}

export function exerciseVolumeKg(se: SessionExercise): number {
  return se.sets.reduce((acc, s) => acc + setVolumeKg(s, se), 0);
}

export function exerciseTotalReps(se: SessionExercise): number {
  if (se.measure === "time") return 0;
  return validSets(se).reduce((acc, s) => acc + (s.reps ?? 0), 0);
}

export function sessionVolumeKg(session: WorkoutSession): number {
  return session.exercises.reduce((acc, se) => acc + exerciseVolumeKg(se), 0);
}

export function sessionEffectiveSets(session: WorkoutSession): number {
  return session.exercises.reduce((acc, se) => acc + validSets(se).length, 0);
}

export function sessionTotalReps(session: WorkoutSession): number {
  return session.exercises.reduce((acc, se) => acc + exerciseTotalReps(se), 0);
}

export function musclesOf(exercise: Pick<Exercise, "primaryMuscle" | "secondaryMuscles">): MuscleInvolvement[] {
  const list: MuscleInvolvement[] = [{ muscle: exercise.primaryMuscle, role: "direta" }];
  for (const m of exercise.secondaryMuscles) {
    if (m !== exercise.primaryMuscle) list.push({ muscle: m, role: "indireta" });
  }
  return list;
}

export interface MuscleLoad {
  /** Séries ponderadas (direta 1,0 + indireta 0,5) */
  sets: number;
  directSets: number;
  indirectSets: number;
  /** Tonelagem ponderada em kg */
  tonnageKg: number;
}

function emptyLoad(): MuscleLoad {
  return { sets: 0, directSets: 0, indirectSets: 0, tonnageKg: 0 };
}

export function muscleLoadForSession(
  session: WorkoutSession,
  exercisesById: Map<string, Exercise>,
): Map<MuscleGroup, MuscleLoad> {
  const map = new Map<MuscleGroup, MuscleLoad>();
  for (const se of session.exercises) {
    const ex = exercisesById.get(se.exerciseId);
    if (!ex) continue;
    const sets = validSets(se);
    if (sets.length === 0) continue;
    const tonnage = exerciseVolumeKg(se);
    for (const inv of musclesOf(ex)) {
      const factor = inv.role === "direta" ? DIRECT_WEIGHT : INDIRECT_WEIGHT;
      const load = map.get(inv.muscle) ?? emptyLoad();
      load.sets += sets.length * factor;
      load.tonnageKg += tonnage * factor;
      if (inv.role === "direta") load.directSets += sets.length;
      else load.indirectSets += sets.length;
      map.set(inv.muscle, load);
    }
  }
  return map;
}

export function muscleLoadForSessions(
  sessions: WorkoutSession[],
  exercisesById: Map<string, Exercise>,
): Map<MuscleGroup, MuscleLoad> {
  const total = new Map<MuscleGroup, MuscleLoad>();
  for (const s of sessions) {
    for (const [muscle, load] of muscleLoadForSession(s, exercisesById)) {
      const acc = total.get(muscle) ?? emptyLoad();
      acc.sets += load.sets;
      acc.directSets += load.directSets;
      acc.indirectSets += load.indirectSets;
      acc.tonnageKg += load.tonnageKg;
      total.set(muscle, acc);
    }
  }
  return total;
}

/** Séries ponderadas programadas na rotina para cada músculo (planejamento, não execução). */
export function plannedMuscleSets(
  prescriptions: { exerciseId: string; sets: number }[],
  exercisesById: Map<string, Exercise>,
): Map<MuscleGroup, MuscleLoad> {
  const map = new Map<MuscleGroup, MuscleLoad>();
  for (const p of prescriptions) {
    const ex = exercisesById.get(p.exerciseId);
    if (!ex) continue;
    for (const inv of musclesOf(ex)) {
      const factor = inv.role === "direta" ? DIRECT_WEIGHT : INDIRECT_WEIGHT;
      const load = map.get(inv.muscle) ?? emptyLoad();
      load.sets += p.sets * factor;
      if (inv.role === "direta") load.directSets += p.sets;
      else load.indirectSets += p.sets;
      map.set(inv.muscle, load);
    }
  }
  return map;
}
