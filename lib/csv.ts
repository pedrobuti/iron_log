import type { WeightUnit, WorkoutSession } from "@/types";
import { formatDateShort, formatTime } from "./dates";
import { toDisplayWeight } from "./units";
import { setVolumeKg } from "./volume";

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Exporta todas as séries das sessões concluídas em CSV (separador ";", compatível com Excel pt-BR).
 * Uma linha por série. Inclui séries não concluídas marcadas como "nao".
 */
export function sessionsToCsv(sessions: WorkoutSession[], unit: WeightUnit): string {
  const header = [
    "data",
    "hora_inicio",
    "sessao_id",
    "treino",
    "duracao_min",
    "exercicio",
    "exercicio_id",
    "serie",
    "extra",
    `carga_${unit}`,
    "repeticoes_ou_segundos",
    "rir",
    "concluida",
    "volume_kg",
    "unilateral",
    "observacoes_exercicio",
    "observacoes_sessao",
  ];
  const rows: string[] = [header.join(";")];
  const sorted = [...sessions]
    .filter((s) => s.status === "concluida")
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (const s of sorted) {
    for (const se of s.exercises) {
      se.sets.forEach((set, idx) => {
        rows.push(
          [
            formatDateShort(s.startedAt),
            formatTime(s.startedAt),
            s.id,
            s.dayName,
            Math.round(s.durationSeconds / 60),
            se.exerciseName,
            se.exerciseId,
            idx + 1,
            set.isExtra ? "sim" : "nao",
            set.weightKg === null ? "" : toDisplayWeight(set.weightKg, unit),
            set.reps ?? "",
            set.rir ?? "",
            set.completed ? "sim" : "nao",
            setVolumeKg(set, se),
            se.isUnilateral ? "sim" : "nao",
            se.notes,
            s.notes,
          ]
            .map(escapeCsv)
            .join(";"),
        );
      });
    }
  }
  return "﻿" + rows.join("\r\n");
}
