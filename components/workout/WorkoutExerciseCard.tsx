"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Eye, History, Lightbulb, Plus, Repeat, SkipForward, Trash2, Undo2, X } from "lucide-react";
import { ExerciseDemoDialog } from "@/components/exercises/ExerciseDemoDialog";
import type { Exercise, SessionExercise, SetLog, Settings } from "@/types";
import type { LoadSuggestion, PerformanceRef } from "@/lib/progression";
import { createSet } from "@/lib/session";
import { formatDateShort } from "@/lib/dates";
import { MUSCLE_LABELS } from "@/lib/labels";
import { formatWeight, fromDisplayWeight, toDisplayWeight } from "@/lib/units";
import { exerciseVolumeKg, isValidSet } from "@/lib/volume";
import { cn, formatNumber, parseNumberInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/field";

export interface WorkoutExerciseCardProps {
  index: number;
  se: SessionExercise;
  exercise: Exercise | undefined;
  settings: Settings;
  last: PerformanceRef | null;
  suggestion: LoadSuggestion;
  onChange: (next: SessionExercise) => void;
  onSetCompleted: (restSeconds: number) => void;
  onRemove: () => void;
  onReplace: () => void;
  onInvalidComplete: (message: string) => void;
}

const SUGGESTION_TONE = {
  aumentar: "border-accent/40 bg-accent/10",
  manter: "border-info/30 bg-info/10",
  reduzir: "border-warn/40 bg-warn/10",
  "sem-historico": "border-line bg-surface-2",
} as const;

export function WorkoutExerciseCard({
  index,
  se,
  exercise,
  settings,
  last,
  suggestion,
  onChange,
  onSetCompleted,
  onRemove,
  onReplace,
  onInvalidComplete,
}: WorkoutExerciseCardProps) {
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [showDemo, setShowDemo] = useState(false);
  const [collapsed, setCollapsed] = useState(se.skipped);
  const unit = settings.unit;
  const isTime = se.measure === "time";

  const completedCount = se.sets.filter((s) => s.completed).length;
  const volume = exerciseVolumeKg(se);
  const lastSets = last?.exercise.sets.filter(isValidSet) ?? [];

  function updateSet(setId: string, patch: Partial<SetLog>) {
    onChange({ ...se, sets: se.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) });
  }

  function toggleComplete(set: SetLog, idx: number) {
    if (set.completed) {
      updateSet(set.id, { completed: false, completedAt: undefined });
      return;
    }
    let reps = set.reps;
    let weight = set.weightKg;
    // Herda valores da série anterior desta sessão quando o campo ficou vazio.
    const prev = idx > 0 ? se.sets[idx - 1] : undefined;
    if (reps === null && prev?.reps != null) reps = prev.reps;
    if (weight === null && prev?.weightKg != null) weight = prev.weightKg;
    if (reps === null || reps <= 0) {
      onInvalidComplete(isTime ? "Informe os segundos da série antes de concluir." : "Informe as repetições da série antes de concluir.");
      return;
    }
    const rir = set.rir ?? (prev?.rir ?? null);
    updateSet(set.id, { completed: true, completedAt: new Date().toISOString(), reps, weightKg: weight, rir });
    onSetCompleted(se.restSeconds > 0 ? se.restSeconds : settings.defaultRestSeconds);
  }

  function addSet() {
    const lastSet = se.sets[se.sets.length - 1];
    onChange({
      ...se,
      sets: [...se.sets, createSet({ isExtra: true, weightKg: lastSet?.weightKg ?? null, rir: lastSet?.rir ?? null })],
    });
  }

  function removeSet(setId: string) {
    onChange({ ...se, sets: se.sets.filter((s) => s.id !== setId) });
  }

  function applySuggestion() {
    if (suggestion.weightKg === null) return;
    onChange({
      ...se,
      sets: se.sets.map((s) => (s.completed ? s : { ...s, weightKg: suggestion.weightKg })),
    });
    setShowSuggestion(false);
  }

  function toggleSkip() {
    const next = !se.skipped;
    onChange({ ...se, skipped: next });
    setCollapsed(next);
  }

  const headerLine = `${se.targetSets} × ${se.repMin}–${se.repMax} ${isTime ? "s" : "reps"}`;

  return (
    <article className={cn("card overflow-hidden transition-colors", se.skipped && "opacity-70")} aria-labelledby={`ex-${se.id}`}>
      <header className="flex items-start gap-3 p-4 pb-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs font-bold text-muted">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <h3 id={`ex-${se.id}`} className="line-clamp-2 text-base font-semibold leading-tight">
            {se.exerciseName}
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>{headerLine}</span>
            <span aria-hidden>·</span>
            <span>descanso {se.restSeconds}s</span>
            {exercise ? (
              <>
                <span aria-hidden>·</span>
                <span>{MUSCLE_LABELS[exercise.primaryMuscle]}</span>
              </>
            ) : null}
            {se.isUnilateral ? <Badge tone="info">unilateral</Badge> : null}
            {se.skipped ? <Badge tone="warn">ignorado</Badge> : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {se.skipped ? (
            <Button variant="ghost" size="sm" onClick={toggleSkip}>
              <Undo2 className="h-4 w-4" /> Retomar
            </Button>
          ) : null}
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular", completedCount === se.sets.length && se.sets.length > 0 ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted")}>
            {completedCount}/{se.sets.length}
          </span>
          <Button variant="ghost" size="icon" aria-label={collapsed ? "Expandir" : "Recolher"} aria-expanded={!collapsed} onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {collapsed ? null : (
        <div className="space-y-3 px-4 pb-4">
          {/* Sugestão de carga */}
          {showSuggestion && !isTime && suggestion.kind !== "sem-historico" ? (
            <div className={cn("flex items-start gap-2 rounded-xl border p-3 text-xs", SUGGESTION_TONE[suggestion.kind])}>
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {suggestion.kind === "aumentar" && suggestion.weightKg !== null
                    ? `Sugestão: ${formatWeight(suggestion.weightKg, unit)} (+${formatWeight(suggestion.incrementKg, unit, false)})`
                    : suggestion.kind === "reduzir" && suggestion.weightKg !== null
                      ? `Sugestão: reduzir para ${formatWeight(suggestion.weightKg, unit)}`
                      : suggestion.kind === "manter" && suggestion.weightKg !== null
                        ? `Sugestão: manter ${formatWeight(suggestion.weightKg, unit)}`
                        : "Sem sugestão de carga"}
                </p>
                <p className="mt-0.5 text-muted">{suggestion.reason}</p>
                {suggestion.weightKg !== null ? (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={applySuggestion}>
                      Aplicar nas séries
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowSuggestion(false)}>
                      Ignorar
                    </Button>
                  </div>
                ) : null}
              </div>
              <button type="button" className="rounded p-0.5 text-muted hover:text-fg" aria-label="Fechar sugestão" onClick={() => setShowSuggestion(false)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}

          {/* Último treino */}
          {last ? (
            <div className="flex items-start gap-2 text-xs text-muted">
              <History className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                <span className="font-medium text-fg">Última vez</span> ({formatDateShort(last.session.startedAt)}):{" "}
                {lastSets
                  .map((s) => `${s.weightKg === null ? "—" : formatWeight(s.weightKg, unit, false)}×${s.reps}${s.rir !== null ? ` @${s.rir}` : ""}`)
                  .join(", ")}
                {last.exercise.notes ? <span className="italic"> · “{last.exercise.notes}”</span> : null}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted">Primeira vez registrando este exercício.</p>
          )}

          {/* Séries */}
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="grid grid-cols-[32px_1fr_1fr_64px_44px_32px] items-center gap-1.5 bg-surface-2 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              <span>#</span>
              <span>{unit}{se.isUnilateral ? "/lado" : ""}</span>
              <span>{isTime ? "seg" : "reps"}</span>
              <span>RIR</span>
              <span className="sr-only">Concluir</span>
              <span className="sr-only">Remover</span>
            </div>
            <ul className="divide-y divide-line">
              {se.sets.map((set, idx) => {
                const prevSet = lastSets[idx];
                return (
                  <SetRow
                    key={set.id}
                    set={set}
                    index={idx}
                    unit={unit}
                    isTime={isTime}
                    previous={prevSet}
                    canRemove={se.sets.length > 1}
                    onPatch={(patch) => updateSet(set.id, patch)}
                    onToggle={() => toggleComplete(set, idx)}
                    onRemove={() => removeSet(set.id)}
                  />
                );
              })}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={addSet}>
              <Plus className="h-4 w-4" /> Adicionar série
            </Button>
            <p className="text-xs tabular text-muted">
              Volume: <span className="font-medium text-fg">{formatNumber(toDisplayWeight(volume, unit))} {unit}</span>
            </p>
          </div>

          <Textarea
            aria-label={`Observações sobre ${se.exerciseName}`}
            placeholder="Observações do exercício (ajuste de banco, dor, técnica…)"
            className="min-h-[56px] text-sm"
            value={se.notes}
            onChange={(e) => onChange({ ...se, notes: e.target.value })}
          />

          <div className="flex flex-wrap gap-1 border-t border-line pt-2">
            {exercise?.demoId || exercise?.technique ? (
              <Button variant="ghost" size="sm" onClick={() => setShowDemo(true)}>
                <Eye className="h-4 w-4" /> Ver execução
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={onReplace}>
              <Repeat className="h-4 w-4" /> Substituir
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleSkip}>
              {se.skipped ? <Undo2 className="h-4 w-4" /> : <SkipForward className="h-4 w-4" />} {se.skipped ? "Retomar" : "Ignorar"}
            </Button>
            <Button variant="ghost" size="sm" className="ml-auto hover:text-danger" onClick={onRemove}>
              <Trash2 className="h-4 w-4" /> Remover
            </Button>
          </div>
        </div>
      )}
      <ExerciseDemoDialog open={showDemo} onClose={() => setShowDemo(false)} exerciseName={se.exerciseName} exercise={exercise} demoId={exercise?.demoId} />
    </article>
  );
}

/* ───────────────────────── Linha de série ───────────────────────── */

function SetRow({
  set,
  index,
  unit,
  isTime,
  previous,
  canRemove,
  onPatch,
  onToggle,
  onRemove,
}: {
  set: SetLog;
  index: number;
  unit: Settings["unit"];
  isTime: boolean;
  previous: SetLog | undefined;
  canRemove: boolean;
  onPatch: (patch: Partial<SetLog>) => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <li className={cn("grid grid-cols-[32px_1fr_1fr_64px_44px_32px] items-center gap-1.5 px-2 py-1.5 transition-colors", set.completed && "bg-accent/5")}>
      <span className="text-xs font-semibold tabular text-muted">
        {index + 1}
        {set.isExtra ? <span className="text-accent">+</span> : null}
      </span>
      <NumberCell
        ariaLabel={`Carga da série ${index + 1}`}
        value={set.weightKg === null ? null : toDisplayWeight(set.weightKg, unit)}
        onChange={(v) => onPatch({ weightKg: v === null ? null : fromDisplayWeight(v, unit) })}
        placeholder={previous?.weightKg != null ? String(toDisplayWeight(previous.weightKg, unit)) : "—"}
        step="0.5"
        disabled={set.completed}
      />
      <NumberCell
        ariaLabel={`${isTime ? "Segundos" : "Repetições"} da série ${index + 1}`}
        value={set.reps}
        onChange={(v) => onPatch({ reps: v === null ? null : Math.round(v) })}
        placeholder={previous?.reps != null ? String(previous.reps) : "—"}
        step="1"
        disabled={set.completed}
      />
      <NumberCell
        ariaLabel={`RIR da série ${index + 1}`}
        value={set.rir}
        onChange={(v) => onPatch({ rir: v === null ? null : Math.max(0, Math.min(10, Math.round(v))) })}
        placeholder={previous?.rir != null ? String(previous.rir) : "—"}
        step="1"
        disabled={set.completed}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={set.completed}
        aria-label={set.completed ? `Desmarcar série ${index + 1}` : `Concluir série ${index + 1}`}
        className={cn(
          "flex h-9 w-full items-center justify-center rounded-lg border transition-all",
          set.completed ? "border-accent bg-accent text-accent-fg shadow-glow" : "border-line bg-surface-2 text-muted hover:border-accent/60 hover:text-accent",
        )}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remover série ${index + 1}`}
        className="flex h-9 w-full items-center justify-center rounded-lg text-muted transition-colors hover:text-danger disabled:opacity-30"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

/** Campo numérico com estado local de texto (permite digitar "," e valores parciais). */
function NumberCell({
  value,
  onChange,
  placeholder,
  step,
  ariaLabel,
  disabled,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
  step: string;
  ariaLabel: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  useEffect(() => {
    const parsed = parseNumberInput(text);
    if (value === null && text !== "") setText("");
    else if (value !== null && parsed !== value) setText(String(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const display = useMemo(() => text, [text]);

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      className={cn("input h-9 px-2 text-center text-sm tabular", disabled && "bg-transparent")}
      value={display}
      placeholder={placeholder}
      data-step={step}
      disabled={disabled}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        const n = parseNumberInput(t);
        if (t.trim() === "") onChange(null);
        else if (n !== null && n >= 0) onChange(n);
      }}
      onFocus={(e) => e.target.select()}
    />
  );
}
