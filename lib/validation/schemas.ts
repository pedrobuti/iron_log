import { z } from "zod";
import { EQUIPMENTS, MOVEMENT_TYPES, MUSCLE_GROUPS, type Equipment, type MovementType, type MuscleGroup } from "@/types";

const isoDate = z.string().min(1);
const weekday = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)]);

export const muscleGroupSchema = z.enum(MUSCLE_GROUPS as unknown as [MuscleGroup, ...MuscleGroup[]]);
export const equipmentSchema = z.enum(EQUIPMENTS as unknown as [Equipment, ...Equipment[]]);
export const movementTypeSchema = z.enum(MOVEMENT_TYPES as unknown as [MovementType, ...MovementType[]]);

export const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres").max(80),
  primaryMuscle: muscleGroupSchema,
  secondaryMuscles: z.array(muscleGroupSchema).default([]),
  equipment: equipmentSchema,
  movementType: movementTypeSchema,
  measure: z.enum(["reps", "time"]).default("reps"),
  isUnilateral: z.boolean().default(false),
  defaultRepMin: z.number().int().min(1).max(300),
  defaultRepMax: z.number().int().min(1).max(600),
  defaultSets: z.number().int().min(1).max(20),
  defaultRestSeconds: z.number().int().min(0).max(900),
  technique: z.string().max(600).optional(),
  isCustom: z.boolean(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

/** Formulário de exercício (sem campos gerados). */
export const exerciseFormSchema = exerciseSchema
  .omit({ id: true, isCustom: true, createdAt: true, updatedAt: true })
  .refine((v) => v.defaultRepMax >= v.defaultRepMin, {
    message: "O máximo deve ser maior ou igual ao mínimo",
    path: ["defaultRepMax"],
  });
export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;

export const prescriptionSchema = z.object({
  id: z.string().min(1),
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).max(20),
  repMin: z.number().int().min(1).max(600),
  repMax: z.number().int().min(1).max(600),
  restSeconds: z.number().int().min(0).max(900),
  notes: z.string().max(300).optional(),
});

export const prescriptionFormSchema = prescriptionSchema
  .omit({ id: true })
  .refine((v) => v.repMax >= v.repMin, { message: "O máximo deve ser maior ou igual ao mínimo", path: ["repMax"] });
export type PrescriptionFormValues = z.infer<typeof prescriptionFormSchema>;

export const routineDaySchema = z.object({
  id: z.string().min(1),
  weekday,
  name: z.string().trim().min(1).max(40),
  focus: z.string().max(80).default(""),
  type: z.enum(["treino", "descanso"]),
  prescriptions: z.array(prescriptionSchema),
});

export const routineDayFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(40),
  focus: z.string().max(80),
  type: z.enum(["treino", "descanso"]),
});
export type RoutineDayFormValues = z.infer<typeof routineDayFormSchema>;

export const routineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  days: z.array(routineDaySchema).length(7),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const setLogSchema = z.object({
  id: z.string().min(1),
  weightKg: z.number().min(0).max(2000).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
  rir: z.number().int().min(0).max(10).nullable(),
  completed: z.boolean(),
  completedAt: isoDate.optional(),
  isExtra: z.boolean().default(false),
});

export const sessionExerciseSchema = z.object({
  id: z.string().min(1),
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  prescriptionId: z.string().optional(),
  targetSets: z.number().int().min(0),
  repMin: z.number().int().min(0),
  repMax: z.number().int().min(0),
  restSeconds: z.number().int().min(0),
  measure: z.enum(["reps", "time"]),
  isUnilateral: z.boolean(),
  sets: z.array(setLogSchema),
  notes: z.string().default(""),
  skipped: z.boolean().default(false),
});

export const workoutSessionSchema = z.object({
  id: z.string().min(1),
  routineDayId: z.string().nullable(),
  dayName: z.string(),
  weekday,
  startedAt: isoDate,
  finishedAt: isoDate.nullable(),
  durationSeconds: z.number().min(0),
  exercises: z.array(sessionExerciseSchema),
  notes: z.string().default(""),
  status: z.enum(["ativa", "concluida"]),
  feeling: z.number().int().min(1).max(5).optional(),
});

export const restLogSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  walkMinutes: z.number().int().min(0).max(600).nullable(),
  mobilityMinutes: z.number().int().min(0).max(600).nullable(),
  notes: z.string().max(1000).default(""),
  createdAt: isoDate,
});

export const restLogFormSchema = z.object({
  walkMinutes: z.number().int().min(0).max(600).nullable(),
  mobilityMinutes: z.number().int().min(0).max(600).nullable(),
  notes: z.string().max(1000),
});
export type RestLogFormValues = z.infer<typeof restLogFormSchema>;

export const settingsSchema = z.object({
  displayName: z.string().trim().max(40).default(""),
  goal: z.enum(["hipertrofia", "forca", "recomposicao", "saude"]),
  experienceLevel: z.enum(["iniciante", "intermediario", "avancado"]),
  trainingDays: z.array(weekday).default([]),
  plannedDurationMin: z.number().int().min(10).max(300),
  defaultRir: z.number().int().min(0).max(5),
  defaultRestSeconds: z.number().int().min(15).max(600),
  unit: z.enum(["kg", "lb"]),
  theme: z.enum(["dark", "light"]),
  weekStartsOn: weekday,
  incrementUpperKg: z.number().min(0.25).max(20),
  incrementLowerKg: z.number().min(0.25).max(50),
  restTimerSound: z.boolean().default(true),
});
export type SettingsFormValues = z.infer<typeof settingsSchema>;

export const appDataSchema = z.object({
  version: z.number().int(),
  settings: settingsSchema,
  exercises: z.array(exerciseSchema),
  routine: routineSchema,
  sessions: z.array(workoutSessionSchema),
  activeSession: workoutSessionSchema.nullable(),
  restLogs: z.array(restLogSchema),
});

/** Formato do arquivo de backup JSON. */
export const backupSchema = z.object({
  app: z.literal("ironlog"),
  exportedAt: isoDate,
  data: appDataSchema,
});
export type BackupFile = z.infer<typeof backupSchema>;

/** Valores de uma série durante o treino (entrada do usuário na unidade de exibição). */
export const setInputSchema = z.object({
  weight: z.number().min(0).max(5000).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
  rir: z.number().int().min(0).max(10).nullable(),
});
