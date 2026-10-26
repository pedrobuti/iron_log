"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowLeftRight, ArrowUp, Footprints, Moon, Pencil, Play, Plus, Repeat, RotateCcw, Trash2 } from "lucide-react";
import type { Exercise, Prescription, RoutineDay, Weekday } from "@/types";
import { useApp, useExercisesById } from "@/lib/store/AppProvider";
import { WEEKDAY_LABELS, WEEKDAY_SHORT, isoWeekday, orderedWeekdays, toDateKey } from "@/lib/dates";
import { MUSCLE_LABELS } from "@/lib/labels";
import { plannedMuscleSets } from "@/lib/volume";
import { prescriptionFormSchema, restLogFormSchema, routineDayFormSchema, type PrescriptionFormValues, type RestLogFormValues, type RoutineDayFormValues } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { ExercisePicker } from "@/components/exercises/ExercisePicker";
import { cn } from "@/lib/utils";

export function WeekPlanner() {
  const { data, actions } = useApp();
  const exercisesById = useExercisesById();
  const router = useRouter();
  const toast = useToast();
  const todayWd = isoWeekday();
  const [selected, setSelected] = useState<Weekday>(todayWd);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const ordered = orderedWeekdays(data.settings.weekStartsOn);
  const day = data.routine.days.find((d) => d.weekday === selected);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Minha semana"
        subtitle={data.routine.name}
        action={
          <Button variant="outline" size="sm" onClick={() => setRestoreOpen(true)}>
            <RotateCcw className="h-4 w-4" /> Restaurar rotina original
          </Button>
        }
      />

      {/* Seletor de dias */}
      <div className="scrollbar-thin -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-7">
        {ordered.map((wd) => {
          const d = data.routine.days.find((x) => x.weekday === wd);
          const active = wd === selected;
          const isToday = wd === todayWd;
          return (
            <button
              key={wd}
              type="button"
              onClick={() => setSelected(wd)}
              aria-pressed={active}
              className={cn(
                "flex min-w-[112px] flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-colors lg:min-w-0",
                active ? "border-accent bg-accent/10" : "border-line bg-surface hover:border-accent/40",
              )}
            >
              <span className="flex w-full items-center justify-between text-xs">
                <span className={cn("font-semibold", active ? "text-accent" : "text-muted")}>{WEEKDAY_SHORT[wd]}</span>
                {isToday ? <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label="hoje" /> : null}
              </span>
              <span className="truncate text-sm font-semibold">{d?.name}</span>
              <span className="truncate text-[11px] text-muted">{d?.type === "descanso" ? "Descanso" : `${d?.prescriptions.length ?? 0} exercícios`}</span>
            </button>
          );
        })}
      </div>

      {day ? (
        day.type === "treino" ? (
          <TrainingDay
            day={day}
            exercisesById={exercisesById}
            isToday={day.weekday === todayWd}
            onStart={() => {
              const s = actions.startSession(day.id);
              if (s) router.push("/treino");
            }}
            hasActive={Boolean(data.activeSession)}
          />
        ) : (
          <RestDay day={day} isToday={day.weekday === todayWd} />
        )
      ) : null}

      <ConfirmDialog
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        title="Restaurar rotina original?"
        description="Todas as alterações feitas nos dias, exercícios, séries e repetições serão substituídas pela rotina inicial. O histórico de treinos não é afetado."
        confirmLabel="Restaurar"
        destructive
        onConfirm={() => {
          actions.restoreDefaultRoutine();
          setRestoreOpen(false);
          toast.success("Rotina original restaurada.");
        }}
      />
    </div>
  );
}

/* ───────────────────────── Dia de treino ───────────────────────── */

function TrainingDay({
  day,
  exercisesById,
  isToday,
  onStart,
  hasActive,
}: {
  day: RoutineDay;
  exercisesById: Map<string, Exercise>;
  isToday: boolean;
  onStart: () => void;
  hasActive: boolean;
}) {
  const { actions, data } = useApp();
  const toast = useToast();
  const [editDay, setEditDay] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<Prescription | null>(null);
  const [editing, setEditing] = useState<Prescription | null>(null);
  const [removing, setRemoving] = useState<Prescription | null>(null);

  const muscles = useMemo(() => {
    const planned = plannedMuscleSets(day.prescriptions, exercisesById);
    return [...planned.entries()].filter(([, l]) => l.directSets > 0).sort((a, b) => b[1].sets - a[1].sets);
  }, [day.prescriptions, exercisesById]);

  const totalSets = day.prescriptions.reduce((a, p) => a + p.sets, 0);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label">{WEEKDAY_LABELS[day.weekday]}</p>
            <h2 className="text-xl font-bold">{day.name}</h2>
            <p className="text-sm text-muted">
              {day.focus} · {day.prescriptions.length} exercícios · {totalSets} séries
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {muscles.map(([m, l]) => (
                <Badge key={m} tone="neutral">
                  {MUSCLE_LABELS[m]} · {l.directSets}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditDay(true)}>
              <Pencil className="h-4 w-4" /> Editar dia
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSwapOpen(true)}>
              <ArrowLeftRight className="h-4 w-4" /> Trocar dia
            </Button>
            <Button onClick={onStart} disabled={day.prescriptions.length === 0}>
              <Play className="h-4 w-4 fill-current" /> {hasActive ? "Retomar treino" : isToday ? "Iniciar treino" : "Iniciar agora"}
            </Button>
          </div>
        </div>
      </Card>

      {day.prescriptions.length === 0 ? (
        <EmptyState
          title="Nenhum exercício neste dia"
          description="Adicione exercícios da biblioteca para montar este treino."
          action={
            <Button onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4" /> Adicionar exercício
            </Button>
          }
        />
      ) : (
        <ol className="space-y-2">
          {day.prescriptions.map((p, idx) => {
            const ex = exercisesById.get(p.exerciseId);
            return (
              <li key={p.id} className="card card-hover flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs font-bold text-muted">{idx + 1}</span>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="text-sm font-semibold leading-tight">{ex?.name ?? "Exercício removido"}</p>
                  <p className="text-xs text-muted">
                    {p.sets} × {p.repMin}–{p.repMax} {ex?.measure === "time" ? "s" : "reps"} · descanso {p.restSeconds}s
                    {ex ? ` · ${MUSCLE_LABELS[ex.primaryMuscle]}` : ""}
                  </p>
                  {p.notes ? <p className="mt-0.5 text-xs text-muted/80">{p.notes}</p> : null}
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-0.5">
                  <Button variant="ghost" size="icon" aria-label="Mover para cima" disabled={idx === 0} onClick={() => actions.movePrescription(day.id, p.id, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Mover para baixo" disabled={idx === day.prescriptions.length - 1} onClick={() => actions.movePrescription(day.id, p.id, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Substituir exercício" onClick={() => setReplaceTarget(p)}>
                    <Repeat className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Editar séries e repetições" onClick={() => setEditing(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Remover exercício" className="hover:text-danger" onClick={() => setRemoving(p)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {day.prescriptions.length > 0 ? (
        <Button variant="outline" className="w-full" onClick={() => setPickerOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar exercício
        </Button>
      ) : null}

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Adicionar exercício ao dia"
        onSelect={(ex) => {
          actions.addPrescription(day.id, {
            exerciseId: ex.id,
            sets: ex.defaultSets,
            repMin: ex.defaultRepMin,
            repMax: ex.defaultRepMax,
            restSeconds: ex.defaultRestSeconds,
          });
          setPickerOpen(false);
          toast.success(`${ex.name} adicionado.`);
        }}
      />

      <ExercisePicker
        open={replaceTarget !== null}
        onClose={() => setReplaceTarget(null)}
        title="Substituir exercício"
        description="A prescrição (séries, repetições, descanso) é mantida. O histórico do exercício anterior continua disponível."
        suggestedMuscle={replaceTarget ? exercisesById.get(replaceTarget.exerciseId)?.primaryMuscle : undefined}
        excludeIds={replaceTarget ? [replaceTarget.exerciseId] : []}
        onSelect={(ex) => {
          if (replaceTarget) actions.updatePrescription(day.id, replaceTarget.id, { exerciseId: ex.id });
          setReplaceTarget(null);
          toast.success(`Substituído por ${ex.name}.`);
        }}
      />

      {editing ? (
        <PrescriptionDialog
          prescription={editing}
          exercise={exercisesById.get(editing.exerciseId)}
          onClose={() => setEditing(null)}
          onSave={(values) => {
            actions.updatePrescription(day.id, editing.id, values);
            setEditing(null);
            toast.success("Prescrição atualizada.");
          }}
        />
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remover exercício do dia?"
        description={`${removing ? exercisesById.get(removing.exerciseId)?.name ?? "Este exercício" : ""} sairá deste treino. O histórico registrado permanece.`}
        confirmLabel="Remover"
        destructive
        onConfirm={() => {
          if (removing) actions.removePrescription(day.id, removing.id);
          setRemoving(null);
        }}
      />

      <DayDialog open={editDay} day={day} onClose={() => setEditDay(false)} />
      <SwapDialog open={swapOpen} day={day} days={data.routine.days} onClose={() => setSwapOpen(false)} />
    </div>
  );
}

function PrescriptionDialog({
  prescription,
  exercise,
  onClose,
  onSave,
}: {
  prescription: Prescription;
  exercise: Exercise | undefined;
  onClose: () => void;
  onSave: (v: PrescriptionFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionFormSchema),
    defaultValues: {
      exerciseId: prescription.exerciseId,
      sets: prescription.sets,
      repMin: prescription.repMin,
      repMax: prescription.repMax,
      restSeconds: prescription.restSeconds,
      notes: prescription.notes ?? "",
    },
  });
  const unitLabel = exercise?.measure === "time" ? "segundos" : "repetições";
  return (
    <Dialog
      open
      onClose={onClose}
      title={exercise?.name ?? "Prescrição"}
      description="Ajuste séries, faixa e descanso para este dia."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="prescription-form">
            Salvar
          </Button>
        </>
      }
    >
      <form id="prescription-form" onSubmit={handleSubmit(onSave)} className="grid grid-cols-2 gap-3" noValidate>
        <input type="hidden" {...register("exerciseId")} />
        <Field label="Séries" htmlFor="p-sets" error={errors.sets?.message}>
          <Input id="p-sets" type="number" inputMode="numeric" min={1} max={20} {...register("sets", { valueAsNumber: true })} data-autofocus />
        </Field>
        <Field label="Descanso (s)" htmlFor="p-rest" error={errors.restSeconds?.message}>
          <Input id="p-rest" type="number" inputMode="numeric" min={0} max={900} step={5} {...register("restSeconds", { valueAsNumber: true })} />
        </Field>
        <Field label={`Mín. ${unitLabel}`} htmlFor="p-min" error={errors.repMin?.message}>
          <Input id="p-min" type="number" inputMode="numeric" min={1} {...register("repMin", { valueAsNumber: true })} />
        </Field>
        <Field label={`Máx. ${unitLabel}`} htmlFor="p-max" error={errors.repMax?.message}>
          <Input id="p-max" type="number" inputMode="numeric" min={1} {...register("repMax", { valueAsNumber: true })} />
        </Field>
        <Field label="Observações" htmlFor="p-notes" className="col-span-2" error={errors.notes?.message}>
          <Textarea id="p-notes" {...register("notes")} placeholder="Ex.: alternativa, ajuste de banco…" />
        </Field>
      </form>
    </Dialog>
  );
}

function DayDialog({ open, day, onClose }: { open: boolean; day: RoutineDay; onClose: () => void }) {
  const { actions } = useApp();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoutineDayFormValues>({
    resolver: zodResolver(routineDayFormSchema),
    defaultValues: { name: day.name, focus: day.focus, type: day.type },
    values: { name: day.name, focus: day.focus, type: day.type },
  });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Editar ${WEEKDAY_LABELS[day.weekday].toLowerCase()}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="day-form">
            Salvar
          </Button>
        </>
      }
    >
      <form
        id="day-form"
        className="space-y-3"
        noValidate
        onSubmit={handleSubmit((v) => {
          actions.updateDay(day.id, v);
          onClose();
        })}
      >
        <Field label="Nome do treino" htmlFor="d-name" error={errors.name?.message}>
          <Input id="d-name" {...register("name")} data-autofocus />
        </Field>
        <Field label="Foco" htmlFor="d-focus" error={errors.focus?.message}>
          <Input id="d-focus" {...register("focus")} placeholder="Ex.: Peito, ombros e tríceps" />
        </Field>
        <Field label="Tipo de dia" htmlFor="d-type" hint={day.prescriptions.length > 0 ? "Mudar para descanso remove os exercícios deste dia." : undefined}>
          <Select id="d-type" {...register("type")}>
            <option value="treino">Treino</option>
            <option value="descanso">Descanso</option>
          </Select>
        </Field>
      </form>
    </Dialog>
  );
}

function SwapDialog({ open, day, days, onClose }: { open: boolean; day: RoutineDay; days: RoutineDay[]; onClose: () => void }) {
  const { actions } = useApp();
  const toast = useToast();
  const [target, setTarget] = useState<Weekday>(day.weekday === 7 ? 1 : ((day.weekday + 1) as Weekday));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Trocar dia da semana"
      description={`Move "${day.name}" para outro dia e traz o conteúdo daquele dia para ${WEEKDAY_LABELS[day.weekday].toLowerCase()}.`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              actions.swapDays(day.weekday, target);
              toast.success(`${day.name} movido para ${WEEKDAY_LABELS[target].toLowerCase()}.`);
              onClose();
            }}
          >
            Trocar
          </Button>
        </>
      }
    >
      <Field label="Trocar com" htmlFor="swap-target">
        <Select id="swap-target" value={target} onChange={(e) => setTarget(Number(e.target.value) as Weekday)} data-autofocus>
          {days
            .filter((d) => d.weekday !== day.weekday)
            .map((d) => (
              <option key={d.id} value={d.weekday}>
                {WEEKDAY_LABELS[d.weekday]} — {d.name}
              </option>
            ))}
        </Select>
      </Field>
    </Dialog>
  );
}

/* ───────────────────────── Dia de descanso ───────────────────────── */

function RestDay({ day, isToday }: { day: RoutineDay; isToday: boolean }) {
  const { data, actions } = useApp();
  const toast = useToast();
  const router = useRouter();
  const [editDay, setEditDay] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const dateKey = toDateKey(new Date());
  const existing = isToday ? data.restLogs.find((r) => r.date === dateKey) : undefined;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<RestLogFormValues>({
    resolver: zodResolver(restLogFormSchema),
    defaultValues: {
      walkMinutes: existing?.walkMinutes ?? null,
      mobilityMinutes: existing?.mobilityMinutes ?? null,
      notes: existing?.notes ?? "",
    },
  });

  const recentLogs = [...data.restLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-info/10 text-info">
              <Moon className="h-5 w-5" />
            </span>
            <div>
              <p className="label">{WEEKDAY_LABELS[day.weekday]}</p>
              <h2 className="text-xl font-bold">{day.name}</h2>
              <p className="text-sm text-muted">{day.focus}. Nada é obrigatório hoje: descanso também é treino.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditDay(true)}>
              <Pencil className="h-4 w-4" /> Editar dia
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSwapOpen(true)}>
              <ArrowLeftRight className="h-4 w-4" /> Trocar dia
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recuperação ativa" subtitle={isToday ? "Registre o que fizer hoje (opcional)" : "Disponível apenas no dia atual"} icon={<Footprints className="h-4 w-4" />} />
          <form
            className="space-y-3"
            noValidate
            onSubmit={handleSubmit((v) => {
              actions.upsertRestLog(dateKey, {
                walkMinutes: Number.isNaN(v.walkMinutes) ? null : v.walkMinutes,
                mobilityMinutes: Number.isNaN(v.mobilityMinutes) ? null : v.mobilityMinutes,
                notes: v.notes,
              });
              toast.success("Registro de recuperação salvo.");
            })}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Caminhada (min)" htmlFor="r-walk" error={errors.walkMinutes?.message}>
                <Input id="r-walk" type="number" inputMode="numeric" min={0} disabled={!isToday} {...register("walkMinutes", { setValueAs: (v) => (v === "" || v === null ? null : Number(v)) })} />
              </Field>
              <Field label="Mobilidade (min)" htmlFor="r-mob" error={errors.mobilityMinutes?.message}>
                <Input id="r-mob" type="number" inputMode="numeric" min={0} disabled={!isToday} {...register("mobilityMinutes", { setValueAs: (v) => (v === "" || v === null ? null : Number(v)) })} />
              </Field>
            </div>
            <Field label="Observações" htmlFor="r-notes" error={errors.notes?.message}>
              <Textarea id="r-notes" disabled={!isToday} placeholder="Como está o sono, dor muscular, disposição…" {...register("notes")} />
            </Field>
            <div className="flex justify-end gap-2">
              {isToday ? (
                <Button type="submit" disabled={!isDirty && !existing}>
                  {existing ? "Atualizar registro" : "Salvar registro"}
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => router.push("/recuperacao")}>
                Ver recuperação
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Registros recentes" subtitle="Últimos dias de recuperação anotados" />
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted">Nenhum registro ainda.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {recentLogs.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium">{r.date.split("-").reverse().join("/")}</p>
                    <p className="text-xs text-muted">
                      {r.walkMinutes ? `Caminhada ${r.walkMinutes} min` : ""}
                      {r.walkMinutes && r.mobilityMinutes ? " · " : ""}
                      {r.mobilityMinutes ? `Mobilidade ${r.mobilityMinutes} min` : ""}
                      {!r.walkMinutes && !r.mobilityMinutes ? "Sem atividades registradas" : ""}
                    </p>
                    {r.notes ? <p className="mt-0.5 text-xs text-muted/80">{r.notes}</p> : null}
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Excluir registro" className="hover:text-danger" onClick={() => actions.deleteRestLog(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <DayDialog open={editDay} day={day} onClose={() => setEditDay(false)} />
      <SwapDialog open={swapOpen} day={day} days={data.routine.days} onClose={() => setSwapOpen(false)} />
    </div>
  );
}
