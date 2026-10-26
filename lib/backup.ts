import type { AppData } from "@/types";
import { backupSchema, type BackupFile } from "./validation/schemas";
import { mergeDefaultExercises } from "./storage/repository";
import { APP_DATA_VERSION } from "@/data/defaults";

export function createBackup(data: AppData): BackupFile {
  return { app: "ironlog", exportedAt: new Date().toISOString(), data };
}

export type ImportResult = { ok: true; data: AppData } | { ok: false; error: string };

/** Valida um JSON de backup. Retorna erro legível quando o arquivo é inválido. */
export function parseBackup(raw: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "O arquivo não é um JSON válido." };
  }
  const result = backupSchema.safeParse(json);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".") || "raiz";
    return { ok: false, error: `Backup inválido (${path}: ${first?.message ?? "erro"}).` };
  }
  const data = result.data.data as AppData;
  return {
    ok: true,
    data: {
      ...data,
      version: APP_DATA_VERSION,
      exercises: mergeDefaultExercises(data.exercises),
      activeSession: data.activeSession && data.activeSession.status === "ativa" ? data.activeSession : null,
    },
  };
}

export function backupFileName(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `ironlog-backup-${y}-${m}-${d}.json`;
}
