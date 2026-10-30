"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addMonths, eachDayOfInterval, endOfMonth, format, getISODay, isSameMonth, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Download, Layers, Pencil, Trash2, Trophy } from "lucide-react";
import type { MuscleGroup, WorkoutSession } from "@/types";
import { MUSCLE_GROUPS } from "@/types";
import { useApp, useExercisesById } from "@/lib/store/AppProvider";
import { WEEKDAY_SHORT, daysAgo, formatDateShort, formatDateTime, orderedWeekdays, toDateKey } from "@/lib/dates";
import { MUSCLE_LABELS } from "@/lib/labels";
import { averageDurationMin, completedSessions, currentWeekSummary, frequencyTarget, sessionsByDateKey, totalEffectiveSets, weeklySeries, summarizeRange } from "@/lib/stats";
import { computePersonalRecords } from "@/lib/records";
import { sessionsToCsv } from "@/lib/csv";
import { downloadTextFile } from "@/lib/download";
import { formatWeight } from "@/lib/units";
import { exerciseVolumeKg, musclesOf, sessionEffectiveSets, sessionVolumeKg, validSets } from "@/lib/volume";
import { MAX_SESSION_MINUTES, withDuration } from "@/lib/session";
import { cn, formatMinutes, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { WeeklyVolumeChart } from "@/components/charts/WeeklyVolumeChart";
import { FrequencyChart } from "@/components/charts/FrequencyChart";
import { startOfTrainingWeek, endOfTrainingWeek } from "@/lib/dates";
import { subWeeks } from "date-fns";

type Period = "7" | "30" | "90" | "365" | "all";

export function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryContent />
    </Suspense>
  );
}

function HistoryContent() {
  const { data, actions } = useApp();
  const exercisesById = useExercisesById();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { sessions, settings, routine } = data;
  const unit = settings.unit;
  const now = new Date();

  const [period, setPeriod] = useState<Period>("30");
  const [exerciseId, setExerciseId] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "">("");
  const [month, setMonth] = useState(startOfMonth(now));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [openIdState, setOpenIdState] = useState<string | null>(null);
  const [dismissedParam, setDismissedParam] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<WorkoutSession | null>(null);

  // A sessão aberta vem do estado local ou do parâmetro ?sessao= (até ser fechado).
  const paramId = searchParams.get("sessao");
  const openId = openIdState ?? (paramId && paramId !== dismissedParam ? paramId : null);
  const setOpenId = (id: string | null) => {
    setOpenIdState(id);
    if (id === null && paramId) setDismissedParam(paramId);
  };

  const completed = useMemo(() => completedSessions(sessions).reverse(), [sessions]);

  const filtered = useMemo(() => {
    const since = period === "all" ? null : daysAgo(Number(period), now);
    return completed.filter((s) => {
      if (since && parseISO(s.startedAt) < since) return false;
      if (exerciseId && !s.exercises.some((e) => e.exerciseId === exerciseId && validSets(e).length > 0)) return false;
      if (muscle) {
        const hit = s.exercises.some((e) => {
          const ex = exercisesById.get(e.exerciseId);
          return ex && validSets(e).length > 0 && musclesOf(ex).some((m) => m.muscle === muscle);
        });
        if (!hit) return false;
      }
      if (selectedDay && toDateKey(parseISO(s.startedAt)) !== selectedDay) return false;
      return true;
    });
  }, [completed, period, exerciseId, muscle, selectedDay, exercisesById]); // eslint-disable-line react-hooks/exhaustive-deps

  const exercisesWithHistory = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of completed) for (const e of s.exercises) if (validSets(e).length > 0) map.set(e.exerciseId, exercisesById.get(e.exerciseId)?.name ?? e.exerciseName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [completed, exercisesById]);

  const byDay = useMemo(() => sessionsByDateKey(sessions), [sessions]);
  const weeks = useMemo(() => weeklySeries(sessions, 8, settings.weekStartsOn, now), [sessions, settings.weekStartsOn]); // eslint-disable-line react-hooks/exhaustive-deps
  const thisWeek = useMemo(() => currentWeekSummary(sessions, settings.weekStartsOn, now), [sessions, settings.weekStartsOn]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastWeek = useMemo(() => {
    const ref = subWeeks(now, 1);
    return summarizeRange(sessions, startOfTrainingWeek(ref, settings.weekStartsOn), endOfTrainingWeek(ref, settings.weekStartsOn));
  }, [sessions, settings.weekStartsOn]); // eslint-disable-line react-hooks/exhaustive-deps
  const records = useMemo(() => computePersonalRecords(sessions), [sessions]);
  const openSession = openId ? sessions.find((s) => s.id === openId) ?? null : null;

  function exportCsv() {
    const csv = sessionsToCsv(filtered.length ? filtered : completed, unit);
    downloadTextFile(`ironlog-historico-${toDateKey(now)}.csv`, csv, "text/csv;charset=utf-8");
    toast.success("CSV exportado", `${(filtered.length ? filtered : completed).length} sessões.`);
  }

  if (completed.length === 0) {
    return (
      <div className="animate-fade-up">
        <PageHeader title="Histórico" subtitle="Sessões concluídas, estatísticas e recordes" />
        <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="Nenhum treino concluído" description="Seu histórico e os gráficos aparecem aqui depois do primeiro treino finalizado." action={<Button onClick={() => router.push("/")}>Ir para o início</Button>} />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        title="Histórico"
        subtitle={`${completed.length} sessões concluídas`}
        action={
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Duração média" value={formatMinutes(averageDurationMin(sessions))} icon={<Clock className="h-4 w-4" />} />
        <Stat label="Séries efetivas" value={formatNumber(totalEffectiveSets(sessions))} icon={<Layers className="h-4 w-4" />} hint="total registrado" />
        <Stat label="Recordes" value={records.length} icon={<Trophy className="h-4 w-4" />} hint="exercícios com PR" />
        <Stat
          label="Semana vs. anterior"
          value={`${thisWeek.sessions}/${lastWeek.sessions}`}
          unit="sessões"
          hint={`${formatWeight(thisWeek.volumeKg, unit)} vs ${formatWeight(lastWeek.volumeKg, unit)}`}
          tone={thisWeek.volumeKg >= lastWeek.volumeKg && thisWeek.sessions > 0 ? "accent" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Volume semanal" subtitle={`Últimas 8 semanas (${unit})`} />
          <WeeklyVolumeChart weeks={weeks} unit={unit} />
        </Card>
        <Card>
          <CardHeader title="Frequência de treino" subtitle={`Sessões por semana · meta ${frequencyTarget(settings, routine)}`} />
          <FrequencyChart weeks={weeks} target={frequencyTarget(settings, routine)} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Calendário */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setMonth((m) => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="text-sm font-semibold capitalize">{format(month, "MMMM yyyy", { locale: ptBR })}</p>
            <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setMonth((m) => addMonths(m, 1))} disabled={isSameMonth(month, now)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Calendar month={month} byDay={byDay} weekStartsOn={settings.weekStartsOn} selected={selectedDay} onSelect={(k) => setSelectedDay((cur) => (cur === k ? null : k))} />
          {selectedDay ? (
            <button className="mt-2 text-xs text-accent hover:underline" onClick={() => setSelectedDay(null)}>
              Limpar seleção ({formatDateShort(selectedDay)})
            </button>
          ) : (
            <p className="mt-2 text-xs text-muted">Toque em um dia para filtrar.</p>
          )}
        </Card>

        {/* Lista */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={period}
              onChange={setPeriod}
              size="sm"
              ariaLabel="Período"
              options={[
                { value: "7", label: "7 dias" },
                { value: "30", label: "30 dias" },
                { value: "90", label: "90 dias" },
                { value: "365", label: "1 ano" },
                { value: "all", label: "Tudo" },
              ]}
            />
            <Select aria-label="Filtrar por exercício" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} className="h-9 w-auto min-w-[160px] text-sm">
              <option value="">Todos os exercícios</option>
              {exercisesWithHistory.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
            <Select aria-label="Filtrar por grupo muscular" value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup | "")} className="h-9 w-auto min-w-[150px] text-sm">
              <option value="">Todos os músculos</option>
              {MUSCLE_GROUPS.map((m) => (
                <option key={m} value={m}>
                  {MUSCLE_LABELS[m]}
                </option>
              ))}
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="Nenhuma sessão com estes filtros" description="Amplie o período ou remova os filtros." />
          ) : (
            <ul className="space-y-2">
              {filtered.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => setOpenId(s.id)} className="card card-hover flex w-full items-center gap-3 p-3 text-left">
                    <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2 text-xs font-semibold">
                      <span className="text-muted">{WEEKDAY_SHORT[s.weekday]}</span>
                      <span>{format(parseISO(s.startedAt), "dd/MM")}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s.dayName}</p>
                      <p className="truncate text-xs text-muted">
                        {formatMinutes(s.durationSeconds / 60)} · {sessionEffectiveSets(s)} séries · {formatWeight(sessionVolumeKg(s), unit)}
                        {s.exercises.some((e) => e.skipped) ? ` · ${s.exercises.filter((e) => e.skipped).length} ignorado(s)` : ""}
                      </p>
                    </div>
                    {s.feeling ? <Badge tone="neutral">{s.feeling}/5</Badge> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {openSession ? (
        <SessionDetails
          session={openSession}
          onClose={() => {
            setOpenId(null);
            if (searchParams.get("sessao")) router.replace("/historico");
          }}
          onDelete={() => setDeleting(openSession)}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Excluir sessão?"
        description={deleting ? `${deleting.dayName} de ${formatDateShort(deleting.startedAt)} será removida permanentemente do histórico.` : undefined}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (deleting) {
            actions.deleteSession(deleting.id);
            toast.success("Sessão excluída.");
          }
          setDeleting(null);
          setOpenId(null);
        }}
      />
    </div>
  );
}

function Calendar({
  month,
  byDay,
  weekStartsOn,
  selected,
  onSelect,
}: {
  month: Date;
  byDay: Map<string, WorkoutSession[]>;
  weekStartsOn: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const order = orderedWeekdays(weekStartsOn);
  const firstOffset = order.indexOf(getISODay(startOfMonth(month)) as 1);
  const todayKey = toDateKey(new Date());
  return (
    <div>
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-muted">
        {order.map((wd) => (
          <span key={wd}>{WEEKDAY_SHORT[wd]}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstOffset }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {days.map((d) => {
          const key = toDateKey(d);
          const has = byDay.has(key);
          const isSel = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-label={`${formatDateShort(d)}${has ? `, ${byDay.get(key)?.length} sessão(ões)` : ""}`}
              aria-pressed={isSel}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-lg text-xs tabular transition-colors",
                has ? "bg-accent/15 font-semibold text-accent hover:bg-accent/25" : "text-muted hover:bg-surface-2",
                isSel && "ring-2 ring-accent",
                key === todayKey && "underline decoration-accent underline-offset-2",
              )}
            >
              {d.getDate()}
              {has ? <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SessionDetails({ session, onClose, onDelete }: { session: WorkoutSession; onClose: () => void; onDelete: () => void }) {
  const { data, actions } = useApp();
  const unit = data.settings.unit;
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(session.notes);
  const [editingEx, setEditingEx] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationMin, setDurationMin] = useState(String(Math.round(session.durationSeconds / 60)));
  const durationNumber = Number(durationMin);
  const durationValid = Number.isFinite(durationNumber) && durationNumber >= 1 && durationNumber <= MAX_SESSION_MINUTES;

  function saveDuration() {
    if (!durationValid) return;
    const next = withDuration(session, durationNumber * 60);
    actions.updateSession(session.id, { durationSeconds: next.durationSeconds, finishedAt: next.finishedAt });
    setEditingDuration(false);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={session.dayName}
      description={`${formatDateTime(session.startedAt)} · ${formatMinutes(session.durationSeconds / 60)} · ${formatWeight(sessionVolumeKg(session), unit)}`}
      size="lg"
      footer={
        <>
          <Button variant="danger" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Excluir sessão
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-line p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="label">Duração</p>
              {!editingDuration ? (
                <p className="text-sm tabular">
                  {formatMinutes(session.durationSeconds / 60)}
                  {session.durationSeconds > 3 * 3600 ? <span className="ml-2 text-xs text-warn">Sessão esquecida aberta? Corrija aqui.</span> : null}
                </p>
              ) : null}
            </div>
            {!editingDuration ? (
              <Button variant="ghost" size="sm" onClick={() => setEditingDuration(true)}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            ) : null}
          </div>
          {editingDuration ? (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div className="w-32">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_SESSION_MINUTES}
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  aria-label="Duração em minutos"
                  data-autofocus
                />
              </div>
              <span className="pb-3 text-xs text-muted">minutos</span>
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setDurationMin(String(Math.round(session.durationSeconds / 60))); setEditingDuration(false); }}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={saveDuration} disabled={!durationValid}>
                  Salvar
                </Button>
              </div>
            </div>
          ) : null}
          {editingDuration && !durationValid ? <p className="mt-1 text-xs text-danger">Entre 1 e {MAX_SESSION_MINUTES} minutos.</p> : null}
        </div>

        <div className="rounded-xl border border-line p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="label">Observações da sessão</p>
            {!editingNotes ? (
              <Button variant="ghost" size="sm" onClick={() => setEditingNotes(true)}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            ) : null}
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Observações da sessão" data-autofocus />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setNotes(session.notes); setEditingNotes(false); }}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={() => { actions.updateSession(session.id, { notes }); setEditingNotes(false); }}>
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-fg/90">{session.notes || <span className="text-muted">Sem observações.</span>}</p>
          )}
        </div>

        <ul className="space-y-2">
          {session.exercises.map((se) => (
            <li key={se.id} className={cn("rounded-xl border border-line p-3", se.skipped && "opacity-70")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{se.exerciseName}</p>
                  <p className="text-xs text-muted">
                    meta {se.targetSets} × {se.repMin}–{se.repMax} · {validSets(se).length} válidas · {formatWeight(exerciseVolumeKg(se), unit)}
                  </p>
                </div>
                {se.skipped ? <Badge tone="warn">ignorado</Badge> : null}
              </div>
              {se.sets.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {se.sets.map((s, i) => (
                    <span key={s.id} className={cn("rounded-md border px-2 py-0.5 text-xs tabular", s.completed ? "border-accent/30 bg-accent/10" : "border-line text-muted line-through")}>
                      {i + 1}: {s.weightKg === null ? "—" : formatWeight(s.weightKg, unit, false)}×{s.reps ?? "—"}
                      {s.rir !== null ? ` @${s.rir}` : ""}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-2">
                {editingEx === se.id ? (
                  <ExerciseNotesEditor
                    initial={se.notes}
                    onCancel={() => setEditingEx(null)}
                    onSave={(v) => {
                      actions.updateSessionExerciseNotes(session.id, se.id, v);
                      setEditingEx(null);
                    }}
                  />
                ) : (
                  <button type="button" className="text-left text-xs text-muted hover:text-fg" onClick={() => setEditingEx(se.id)}>
                    {se.notes ? <span className="italic">“{se.notes}”</span> : "Adicionar observação"} <Pencil className="ml-1 inline h-3 w-3" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}

function ExerciseNotesEditor({ initial, onSave, onCancel }: { initial: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="space-y-2">
      <Textarea value={v} onChange={(e) => setV(e.target.value)} className="min-h-[60px] text-sm" aria-label="Observação do exercício" data-autofocus />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" onClick={() => onSave(v)}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
