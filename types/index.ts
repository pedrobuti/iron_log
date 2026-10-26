/**
 * Tipos centrais do IronLog.
 * Convenções:
 *  - Cargas são sempre armazenadas em KG. A conversão para lb acontece só na camada de UI.
 *  - Datas/horários são strings ISO 8601 (UTC) geradas por `new Date().toISOString()`.
 *  - Identificadores são UUIDs estáveis gerados em `lib/id.ts`.
 */

export type MuscleGroup =
  | "peito"
  | "costas"
  | "ombros"
  | "biceps"
  | "triceps"
  | "quadriceps"
  | "posteriores"
  | "gluteos"
  | "panturrilhas"
  | "abdomen"
  | "antebracos"
  | "trapezio"
  | "lombar";

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  "peito",
  "costas",
  "ombros",
  "biceps",
  "triceps",
  "quadriceps",
  "posteriores",
  "gluteos",
  "panturrilhas",
  "abdomen",
  "antebracos",
  "trapezio",
  "lombar",
] as const;

export type Equipment =
  | "barra"
  | "halteres"
  | "maquina"
  | "polia"
  | "peso-corporal"
  | "kettlebell"
  | "elastico"
  | "outro";

export const EQUIPMENTS: readonly Equipment[] = [
  "barra",
  "halteres",
  "maquina",
  "polia",
  "peso-corporal",
  "kettlebell",
  "elastico",
  "outro",
] as const;

export type MovementType =
  | "empurrar-horizontal"
  | "empurrar-vertical"
  | "puxar-horizontal"
  | "puxar-vertical"
  | "dominante-joelho"
  | "dominante-quadril"
  | "isolado"
  | "core"
  | "cardio";

export const MOVEMENT_TYPES: readonly MovementType[] = [
  "empurrar-horizontal",
  "empurrar-vertical",
  "puxar-horizontal",
  "puxar-vertical",
  "dominante-joelho",
  "dominante-quadril",
  "isolado",
  "core",
  "cardio",
] as const;

/** Como a série é medida: repetições ou tempo (segundos). */
export type Measure = "reps" | "time";

/** Participação de um músculo em um exercício. */
export interface MuscleInvolvement {
  muscle: MuscleGroup;
  /** direta = motor primário; indireta = sinergista/auxiliar */
  role: "direta" | "indireta";
}

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  /** Músculos auxiliares/sinergistas (participação indireta). */
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  movementType: MovementType;
  measure: Measure;
  /** Exercício unilateral: ver convenção de volume em lib/volume.ts */
  isUnilateral: boolean;
  /** Faixa de repetições recomendada por padrão (usada ao adicionar à rotina). */
  defaultRepMin: number;
  defaultRepMax: number;
  defaultSets: number;
  defaultRestSeconds: number;
  /** Observações técnicas livres. */
  technique?: string;
  /** true quando criado pelo usuário (editável/excluível). */
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Prescrição de um exercício dentro de um dia da rotina. */
export interface Prescription {
  id: string;
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  notes?: string;
}

export type DayType = "treino" | "descanso";

/** Dia da semana no padrão ISO: 1 = segunda ... 7 = domingo. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface RoutineDay {
  id: string;
  weekday: Weekday;
  name: string;
  focus: string;
  type: DayType;
  prescriptions: Prescription[];
}

export interface Routine {
  id: string;
  name: string;
  days: RoutineDay[];
  createdAt: string;
  updatedAt: string;
}

export interface SetLog {
  id: string;
  /** Carga em kg (null quando não informado). Para tempo: carga opcional. */
  weightKg: number | null;
  /** Repetições realizadas, ou segundos quando measure = "time". */
  reps: number | null;
  /** Reps in Reserve (0–10) */
  rir: number | null;
  completed: boolean;
  completedAt?: string;
  /** Série adicionada além do prescrito. */
  isExtra: boolean;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  /** Snapshot do nome no momento da sessão (histórico resiste a renomeações). */
  exerciseName: string;
  prescriptionId?: string;
  targetSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  measure: Measure;
  isUnilateral: boolean;
  sets: SetLog[];
  notes: string;
  skipped: boolean;
}

export type SessionStatus = "ativa" | "concluida";

export interface WorkoutSession {
  id: string;
  routineDayId: string | null;
  dayName: string;
  weekday: Weekday;
  startedAt: string;
  finishedAt: string | null;
  /** Segundos efetivos (pausas não são descontadas; é o tempo total da sessão). */
  durationSeconds: number;
  exercises: SessionExercise[];
  notes: string;
  status: SessionStatus;
  /** Avaliação subjetiva opcional (1–5) ao finalizar. */
  feeling?: number;
}

export interface RestLog {
  id: string;
  /** Data local no formato YYYY-MM-DD */
  date: string;
  walkMinutes: number | null;
  mobilityMinutes: number | null;
  notes: string;
  createdAt: string;
}

export type WeightUnit = "kg" | "lb";
export type Theme = "dark" | "light";
export type Goal = "hipertrofia" | "forca" | "recomposicao" | "saude";
export type ExperienceLevel = "iniciante" | "intermediario" | "avancado";

export interface Settings {
  displayName: string;
  goal: Goal;
  experienceLevel: ExperienceLevel;
  /** Dias de treino (ISO weekday). Usado para a frequência alvo. */
  trainingDays: Weekday[];
  plannedDurationMin: number;
  defaultRir: number;
  defaultRestSeconds: number;
  unit: WeightUnit;
  theme: Theme;
  /** 1 = segunda, 7 = domingo */
  weekStartsOn: Weekday;
  /** Incremento sugerido para exercícios de membros superiores (kg). */
  incrementUpperKg: number;
  /** Incremento sugerido para membros inferiores (kg). */
  incrementLowerKg: number;
  /** Timer de descanso toca um aviso sonoro ao final. */
  restTimerSound: boolean;
}

/** Documento completo persistido. */
export interface AppData {
  version: number;
  settings: Settings;
  exercises: Exercise[];
  routine: Routine;
  sessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  restLogs: RestLog[];
}

export type StorageKey = keyof Omit<AppData, "version">;

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  /** Maior carga registrada em série válida */
  maxWeightKg: number;
  maxWeightReps: number;
  maxWeightDate: string;
  /** Maior 1RM estimado (Epley) */
  bestE1rmKg: number;
  bestE1rmDate: string;
  /** Maior volume (kg) em uma única sessão */
  bestSessionVolumeKg: number;
  bestSessionVolumeDate: string;
}
