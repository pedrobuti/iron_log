"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Equipment, Exercise, MuscleGroup } from "@/types";
import { EQUIPMENTS, MUSCLE_GROUPS } from "@/types";
import { useApp } from "@/lib/store/AppProvider";
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from "@/lib/labels";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export function filterExercises(
  list: Exercise[],
  query: string,
  muscle: MuscleGroup | "",
  equipment: Equipment | "",
): Exercise[] {
  const q = query.trim().toLocaleLowerCase("pt-BR");
  return list
    .filter((e) => (muscle ? e.primaryMuscle === muscle || e.secondaryMuscles.includes(muscle) : true))
    .filter((e) => (equipment ? e.equipment === equipment : true))
    .filter((e) => (q ? e.name.toLocaleLowerCase("pt-BR").includes(q) : true))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function ExercisePicker({
  open,
  onClose,
  onSelect,
  title = "Escolher exercício",
  description,
  excludeIds = [],
  suggestedMuscle,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  title?: string;
  description?: string;
  excludeIds?: string[];
  suggestedMuscle?: MuscleGroup;
}) {
  const { data } = useApp();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "">(suggestedMuscle ?? "");
  const [equipment, setEquipment] = useState<Equipment | "">("");

  const results = useMemo(
    () => filterExercises(data.exercises, query, muscle, equipment).filter((e) => !excludeIds.includes(e.id)),
    [data.exercises, query, muscle, equipment, excludeIds],
  );

  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} size="md">
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            aria-label="Pesquisar exercício"
            placeholder="Pesquisar…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-autofocus
          />
        </div>
        <Select aria-label="Filtrar por grupo muscular" value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup | "")}>
          <option value="">Todos os músculos</option>
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>
              {MUSCLE_LABELS[m]}
            </option>
          ))}
        </Select>
        <Select aria-label="Filtrar por equipamento" value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment | "")}>
          <option value="">Todo equipamento</option>
          {EQUIPMENTS.map((eq) => (
            <option key={eq} value={eq}>
              {EQUIPMENT_LABELS[eq]}
            </option>
          ))}
        </Select>
      </div>
      {results.length === 0 ? (
        <EmptyState title="Nenhum exercício encontrado" description="Ajuste os filtros ou crie um exercício personalizado na biblioteca." />
      ) : (
        <ul className="max-h-[50dvh] divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {results.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onSelect(e)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.name}</p>
                  <p className="truncate text-xs text-muted">
                    {MUSCLE_LABELS[e.primaryMuscle]} · {EQUIPMENT_LABELS[e.equipment]}
                    {e.isUnilateral ? " · unilateral" : ""}
                  </p>
                </div>
                {e.isCustom ? <Badge tone="info">Personalizado</Badge> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
