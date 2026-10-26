"use client";

import { useMemo, useState } from "react";
import { Dumbbell, Pencil, Plus, Search, Trash2, Trophy } from "lucide-react";
import type { Equipment, Exercise, MuscleGroup } from "@/types";
import { EQUIPMENTS, MUSCLE_GROUPS } from "@/types";
import { useApp } from "@/lib/store/AppProvider";
import { EQUIPMENT_LABELS, MOVEMENT_LABELS, MUSCLE_LABELS } from "@/lib/labels";
import { exerciseHistory, topWeight } from "@/lib/progression";
import { computePersonalRecords } from "@/lib/records";
import { formatDateShort } from "@/lib/dates";
import { formatWeight } from "@/lib/units";
import { exerciseVolumeKg, validSets } from "@/lib/volume";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { ExerciseForm } from "./ExerciseForm";
import { filterExercises } from "./ExercisePicker";
import { cn } from "@/lib/utils";

export function ExerciseLibrary() {
  const { data, actions } = useApp();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "">("");
  const [equipment, setEquipment] = useState<Equipment | "">("");
  const [onlyCustom, setOnlyCustom] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [details, setDetails] = useState<Exercise | null>(null);
  const [deleting, setDeleting] = useState<Exercise | null>(null);

  const list = useMemo(
    () => filterExercises(data.exercises, query, muscle, equipment).filter((e) => (onlyCustom ? e.isCustom : true)),
    [data.exercises, query, muscle, equipment, onlyCustom],
  );
  const records = useMemo(() => new Map(computePersonalRecords(data.sessions).map((r) => [r.exerciseId, r])), [data.sessions]);
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of data.routine.days) for (const p of d.prescriptions) m.set(p.exerciseId, (m.get(p.exerciseId) ?? 0) + 1);
    return m;
  }, [data.routine.days]);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Exercícios"
        subtitle={`${data.exercises.length} exercícios · ${data.exercises.filter((e) => e.isCustom).length} personalizados`}
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Novo exercício
          </Button>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input aria-label="Pesquisar exercício" placeholder="Pesquisar…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select aria-label="Grupo muscular" value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup | "")}>
          <option value="">Todos os músculos</option>
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>
              {MUSCLE_LABELS[m]}
            </option>
          ))}
        </Select>
        <Select aria-label="Equipamento" value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment | "")}>
          <option value="">Todo equipamento</option>
          {EQUIPMENTS.map((eq) => (
            <option key={eq} value={eq}>
              {EQUIPMENT_LABELS[eq]}
            </option>
          ))}
        </Select>
        <Button variant={onlyCustom ? "secondary" : "outline"} onClick={() => setOnlyCustom((v) => !v)} aria-pressed={onlyCustom}>
          Personalizados
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Dumbbell className="h-6 w-6" />} title="Nenhum exercício encontrado" description="Ajuste os filtros ou crie um exercício personalizado." />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => {
            const rec = records.get(e.id);
            const uses = usage.get(e.id) ?? 0;
            return (
              <li key={e.id} className="card card-hover flex flex-col gap-2 p-4">
                <button type="button" className="text-left" onClick={() => setDetails(e)}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{e.name}</h3>
                    {e.isCustom ? <Badge tone="info">Personalizado</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {MUSCLE_LABELS[e.primaryMuscle]}
                    {e.secondaryMuscles.length ? ` (+ ${e.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(", ")})` : ""}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    <Badge>{EQUIPMENT_LABELS[e.equipment]}</Badge>
                    <Badge>{MOVEMENT_LABELS[e.movementType]}</Badge>
                    <Badge>
                      {e.defaultSets} × {e.defaultRepMin}–{e.defaultRepMax}
                      {e.measure === "time" ? "s" : ""}
                    </Badge>
                    {e.isUnilateral ? <Badge tone="info">unilateral</Badge> : null}
                  </p>
                </button>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-2 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    {rec ? (
                      <>
                        <Trophy className="h-3.5 w-3.5 text-accent" /> {formatWeight(rec.maxWeightKg, data.settings.unit)} × {rec.maxWeightReps}
                      </>
                    ) : (
                      "Sem recorde"
                    )}
                  </span>
                  <span className="flex items-center gap-0.5">
                    {uses > 0 ? <span className="mr-1">na rotina ×{uses}</span> : null}
                    <Button variant="ghost" size="icon" aria-label={`Editar ${e.name}`} onClick={() => { setEditing(e); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {e.isCustom ? (
                      <Button variant="ghost" size="icon" aria-label={`Excluir ${e.name}`} className="hover:text-danger" onClick={() => setDeleting(e)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ExerciseForm
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={(values) => {
          if (editing) {
            const patch = editing.isCustom
              ? values
              : {
                  primaryMuscle: values.primaryMuscle,
                  secondaryMuscles: values.secondaryMuscles,
                  movementType: values.movementType,
                  isUnilateral: values.isUnilateral,
                  defaultRepMin: values.defaultRepMin,
                  defaultRepMax: values.defaultRepMax,
                  defaultSets: values.defaultSets,
                  defaultRestSeconds: values.defaultRestSeconds,
                  technique: values.technique,
                };
            actions.updateExercise(editing.id, patch);
            toast.success("Exercício atualizado.");
          } else {
            actions.addExercise(values);
            toast.success("Exercício criado.");
          }
          setFormOpen(false);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Excluir "${deleting?.name}"?`}
        description="O exercício sai da biblioteca. Sessões antigas mantêm o nome registrado no histórico."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          const r = actions.deleteExercise(deleting.id);
          if (r.ok) toast.success("Exercício excluído.");
          else toast.error("Não foi possível excluir", r.reason);
          setDeleting(null);
        }}
      />

      {details ? <ExerciseDetails exercise={details} onClose={() => setDetails(null)} /> : null}
    </div>
  );
}

function ExerciseDetails({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const { data } = useApp();
  const history = useMemo(() => exerciseHistory(data.sessions, exercise.id).slice(0, 10), [data.sessions, exercise.id]);
  const rec = useMemo(() => computePersonalRecords(data.sessions).find((r) => r.exerciseId === exercise.id), [data.sessions, exercise.id]);
  const unit = data.settings.unit;
  return (
    <Dialog open onClose={onClose} title={exercise.name} description={`${MUSCLE_LABELS[exercise.primaryMuscle]} · ${EQUIPMENT_LABELS[exercise.equipment]} · ${MOVEMENT_LABELS[exercise.movementType]}`} size="md">
      <div className="space-y-4 text-sm">
        <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <Info label="Séries" value={String(exercise.defaultSets)} />
          <Info label={exercise.measure === "time" ? "Segundos" : "Repetições"} value={`${exercise.defaultRepMin}–${exercise.defaultRepMax}`} />
          <Info label="Descanso" value={`${exercise.defaultRestSeconds}s`} />
          <Info label="Unilateral" value={exercise.isUnilateral ? "Sim" : "Não"} />
        </dl>
        {exercise.secondaryMuscles.length ? (
          <p className="text-xs text-muted">Auxiliares: {exercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(", ")}</p>
        ) : null}
        {exercise.technique ? (
          <div>
            <p className="label mb-1">Técnica</p>
            <p className="leading-relaxed text-fg/90">{exercise.technique}</p>
          </div>
        ) : null}
        {rec ? (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
            <p className="label mb-1 flex items-center gap-1 text-accent">
              <Trophy className="h-3.5 w-3.5" /> Recordes
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Info label="Carga máx." value={`${formatWeight(rec.maxWeightKg, unit)} × ${rec.maxWeightReps}`} />
              <Info label="1RM est." value={formatWeight(rec.bestE1rmKg, unit)} />
              <Info label="Volume/sessão" value={formatWeight(rec.bestSessionVolumeKg, unit)} />
            </div>
          </div>
        ) : null}
        <div>
          <p className="label mb-1">Histórico recente</p>
          {history.length === 0 ? (
            <p className="text-xs text-muted">Nenhuma sessão registrada com este exercício.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {history.map(({ session, exercise: se }) => (
                <li key={se.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                  <div>
                    <p className="font-medium">{formatDateShort(session.startedAt)} · {session.dayName}</p>
                    <p className="text-muted">
                      {validSets(se).map((s) => `${s.weightKg === null ? "—" : formatWeight(s.weightKg, unit, false)}×${s.reps}`).join(", ")}
                    </p>
                  </div>
                  <div className="text-right tabular">
                    <p className="font-medium">{formatWeight(topWeight(se), unit)}</p>
                    <p className="text-muted">{formatWeight(exerciseVolumeKg(se), unit)} vol.</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function Info({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-lg bg-surface-2 p-2", className)}>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular">{value}</dd>
    </div>
  );
}
