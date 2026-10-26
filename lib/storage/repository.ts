import type { AppData, StorageKey } from "@/types";
import { DEFAULT_EXERCISES } from "@/data/exercises";
import { createDefaultRoutine } from "@/data/routine";
import { APP_DATA_VERSION, DEFAULT_SETTINGS } from "@/data/defaults";
import {
  exerciseSchema,
  restLogSchema,
  routineSchema,
  settingsSchema,
  workoutSessionSchema,
} from "@/lib/validation/schemas";
import { STORAGE_KEYS, type StorageAdapter } from "./types";

export interface LoadResult {
  data: AppData;
  /** Problemas não fatais encontrados (ex.: chave corrompida substituída pelo padrão). */
  issues: string[];
  /** true quando nenhuma chave existia (primeiro uso). */
  isFirstRun: boolean;
}

export function createDefaultAppData(): AppData {
  return {
    version: APP_DATA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    exercises: DEFAULT_EXERCISES.map((e) => ({ ...e, secondaryMuscles: [...e.secondaryMuscles] })),
    routine: createDefaultRoutine(),
    sessions: [],
    activeSession: null,
    restLogs: [],
  };
}

/**
 * Garante que todos os exercícios padrão existam (novos exercícios adicionados em
 * versões futuras aparecem sem apagar personalizações do usuário).
 */
export function mergeDefaultExercises(stored: AppData["exercises"]): AppData["exercises"] {
  const ids = new Set(stored.map((e) => e.id));
  const missing = DEFAULT_EXERCISES.filter((e) => !ids.has(e.id));
  return missing.length ? [...stored, ...missing] : stored;
}

/** Carrega e valida cada chave; chaves ausentes/corrompidas recebem o valor padrão. */
export async function loadAppData(adapter: StorageAdapter): Promise<LoadResult> {
  const defaults = createDefaultAppData();
  const issues: string[] = [];
  let existing = 0;

  async function read<K extends StorageKey>(key: K, parse: (raw: unknown) => AppData[K] | null): Promise<AppData[K]> {
    let raw: unknown;
    try {
      raw = await adapter.getItem(key);
    } catch (err) {
      issues.push(err instanceof Error ? err.message : `Falha ao ler "${key}".`);
      return defaults[key];
    }
    if (raw === undefined || raw === null) return defaults[key];
    existing++;
    const parsed = parse(raw);
    if (parsed === null) {
      issues.push(`Os dados de "${key}" estavam inválidos e foram substituídos pelo padrão.`);
      return defaults[key];
    }
    return parsed;
  }

  const settings = await read("settings", (raw) => {
    const r = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...(typeof raw === "object" && raw ? raw : {}) });
    return r.success ? (r.data as AppData["settings"]) : null;
  });

  const exercises = await read("exercises", (raw) => {
    if (!Array.isArray(raw)) return null;
    const valid: AppData["exercises"] = [];
    let dropped = 0;
    for (const item of raw) {
      const r = exerciseSchema.safeParse(item);
      if (r.success) valid.push(r.data as AppData["exercises"][number]);
      else dropped++;
    }
    if (dropped > 0) issues.push(`${dropped} exercício(s) inválido(s) foram ignorados ao carregar.`);
    return mergeDefaultExercises(valid);
  });

  const routine = await read("routine", (raw) => {
    const r = routineSchema.safeParse(raw);
    return r.success ? (r.data as AppData["routine"]) : null;
  });

  const sessions = await read("sessions", (raw) => {
    if (!Array.isArray(raw)) return null;
    const valid: AppData["sessions"] = [];
    let dropped = 0;
    for (const item of raw) {
      const r = workoutSessionSchema.safeParse(item);
      if (r.success) valid.push(r.data as AppData["sessions"][number]);
      else dropped++;
    }
    if (dropped > 0) issues.push(`${dropped} sessão(ões) inválida(s) foram ignoradas ao carregar.`);
    return valid;
  });

  const activeSession = await read("activeSession", (raw) => {
    if (raw === null) return null;
    const r = workoutSessionSchema.safeParse(raw);
    if (!r.success) return null;
    const s = r.data as NonNullable<AppData["activeSession"]>;
    return s.status === "ativa" ? s : null;
  });

  const restLogs = await read("restLogs", (raw) => {
    if (!Array.isArray(raw)) return null;
    const valid: AppData["restLogs"] = [];
    for (const item of raw) {
      const r = restLogSchema.safeParse(item);
      if (r.success) valid.push(r.data as AppData["restLogs"][number]);
    }
    return valid;
  });

  return {
    data: { version: APP_DATA_VERSION, settings, exercises, routine, sessions, activeSession, restLogs },
    issues,
    isFirstRun: existing === 0,
  };
}

/** Persiste todas as chaves (usado em importação de backup e restauração). */
export async function saveAllAppData(adapter: StorageAdapter, data: AppData): Promise<void> {
  for (const key of STORAGE_KEYS) {
    await adapter.setItem(key, data[key]);
  }
}
