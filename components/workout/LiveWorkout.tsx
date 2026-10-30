"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, Dumbbell, Flag, Plus, Sun, Timer, Trash2, Trophy } from "lucide-react";
import type { Exercise, SessionExercise, WorkoutSession } from "@/types";
import { useApp, useExercisesById } from "@/lib/store/AppProvider";
import { formatDateTime, isoWeekday } from "@/lib/dates";
import { useRestPush } from "@/lib/hooks/useRestPush";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { isRestNotificationsEnabled } from "@/lib/push/client";
import { lastPerformance, suggestLoad } from "@/lib/progression";
import { detectNewRecords } from "@/lib/records";
import { LONG_SESSION_SECONDS, MAX_SESSION_MINUTES, createSessionExercise, elapsedSeconds, sessionProgress, summarizeForFinish } from "@/lib/session";
import { formatWeight } from "@/lib/units";
import { formatDuration, formatMinutes } from "@/lib/utils";
import { sessionEffectiveSets, sessionVolumeKg } from "@/lib/volume";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { RingProgress } from "@/components/ui/progress";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ExercisePicker } from "@/components/exercises/ExercisePicker";
import { RestTimer } from "./RestTimer";
import { WorkoutExerciseCard } from "./WorkoutExerciseCard";

export function LiveWorkout() {
  const { data } = useApp();
  const session = data.activeSession;
  if (!session) return <NoActiveSession />;
  return <ActiveWorkout session={session} />;
}

function NoActiveSession() {
  const { data, actions } = useApp();
  const today = data.routine.days.find((d) => d.weekday === isoWeekday());
  return (
    <EmptyState
      className="mt-6"
      icon={<Dumbbell className="h-6 w-6" />}
      title="Nenhum treino em andamento"
      description={today?.type === "treino" ? `Hoje é dia de ${today.name}. Inicie o treino programado ou uma sessão livre.` : "Hoje é dia de descanso na sua rotina. Você pode iniciar uma sessão livre se quiser."}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {today?.type === "treino" ? (
            <Button onClick={() => actions.startSession(today.id)}>Iniciar {today.name}</Button>
          ) : null}
          <Button variant="outline" onClick={() => actions.startFreeSession("Treino livre")}>
            Sessão livre
          </Button>
          <Link href="/semana" className="inline-flex h-11 items-center px-3 text-sm text-muted hover:text-fg">
            Ver semana
          </Link>
        </div>
      }
    />
  );
}

function ActiveWorkout({ session }: { session: WorkoutSession }) {
  const { data, actions } = useApp();
  const exercisesById = useExercisesById();
  const router = useRouter();
  const toast = useToast();
  const { settings, sessions } = data;

  const [elapsed, setElapsed] = useState(() => elapsedSeconds(session));
  const [restToken, setRestToken] = useState(0);
  const [restDuration, setRestDuration] = useState(settings.defaultRestSeconds);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [feeling, setFeeling] = useState<number | undefined>(undefined);
  // Sessão esquecida aberta: o tempo decorrido não representa o treino; o usuário informa a duração real.
  const forgotten = elapsed > LONG_SESSION_SECONDS;
  const [manualMinutes, setManualMinutes] = useState<string>(String(settings.plannedDurationMin));
  const manualMinutesNumber = Number(manualMinutes);
  const manualValid = !forgotten || (Number.isFinite(manualMinutesNumber) && manualMinutesNumber >= 1 && manualMinutesNumber <= MAX_SESSION_MINUTES);
  const restLabelRef = useRef<string | undefined>(undefined);
  const restNotifier = useRestPush(restLabelRef);
  const wakeLock = useWakeLock(settings.keepScreenOn);
  // Só lido no cliente (esta tela nunca é pré-renderizada com sessão ativa).
  const [notificationsOn] = useState(() => isRestNotificationsEnabled());

  useEffect(() => {
    const id = setInterval(() => setElapsed(elapsedSeconds(session)), 1000);
    return () => clearInterval(id);
  }, [session.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = sessionProgress(session);

  const perExercise = useMemo(
    () =>
      session.exercises.map((se) => {
        const exercise = exercisesById.get(se.exerciseId);
        const last = lastPerformance(sessions, se.exerciseId, session.id);
        const suggestion = suggestLoad({
          last: last?.exercise ?? null,
          repMin: se.repMin,
          repMax: se.repMax,
          targetSets: se.targetSets,
          exercise,
          settings,
        });
        return { se, exercise, last, suggestion };
      }),
    [session.exercises, session.id, exercisesById, sessions, settings],
  );

  const updateExercise = useCallback(
    (next: SessionExercise) =>
      actions.updateActiveSession((s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === next.id ? next : e)) })),
    [actions],
  );

  function addExercise(ex: Exercise) {
    const se = createSessionExercise(ex, {
      sets: ex.defaultSets,
      repMin: ex.defaultRepMin,
      repMax: ex.defaultRepMax,
      restSeconds: ex.defaultRestSeconds,
    });
    actions.updateActiveSession((s) => ({ ...s, exercises: [...s.exercises, se] }));
    setPickerOpen(false);
    toast.success(`${ex.name} adicionado à sessão.`);
  }

  function replaceExercise(ex: Exercise) {
    if (!replaceId) return;
    actions.updateActiveSession((s) => ({
      ...s,
      exercises: s.exercises.map((e) =>
        e.id === replaceId
          ? {
              ...e,
              exerciseId: ex.id,
              exerciseName: ex.name,
              measure: ex.measure,
              isUnilateral: ex.isUnilateral,
              sets: e.sets.map((set) => (set.completed ? set : { ...set, weightKg: null })),
            }
          : e,
      ),
    }));
    setReplaceId(null);
    toast.success(`Substituído por ${ex.name}.`);
  }

  function finish() {
    if (!manualValid) return;
    const finished = actions.finishActiveSession(feeling, forgotten ? Math.round(manualMinutesNumber * 60) : undefined);
    setFinishOpen(false);
    if (!finished) return;
    const records = detectNewRecords(finished, [...sessions, finished]);
    toast.success("Treino salvo!", `${formatMinutes(finished.durationSeconds / 60)} · ${sessionEffectiveSets(finished)} séries · ${formatWeight(sessionVolumeKg(finished), settings.unit)}`);
    if (records.length > 0) {
      const first = records[0];
      toast.info(
        `${records.length} novo${records.length > 1 ? "s" : ""} recorde${records.length > 1 ? "s" : ""}!`,
        first ? `${first.exerciseName}: ${first.type === "carga" ? "carga" : first.type === "e1rm" ? "1RM estimado" : "volume"} ${formatWeight(first.value, settings.unit)}` : undefined,
      );
    }
    router.push(`/historico?sessao=${finished.id}`);
  }

  const summary = summarizeForFinish(session);

  return (
    <div className="animate-fade-up pb-32">
      {/* Cabeçalho */}
      <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <RingProgress value={progress.pct} size={48} stroke={4}>
            {progress.pct}%
          </RingProgress>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold leading-tight">{session.dayName}</h1>
            <p className="flex items-center gap-1 text-xs tabular text-muted">
              <Timer className="h-3.5 w-3.5" /> {formatDuration(elapsed)} · {progress.done}/{progress.total} séries
            </p>
          </div>
          <Button variant="ghost" size="sm" className="hover:text-danger" aria-label="Descartar sessão" onClick={() => setDiscardOpen(true)}>
            <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Descartar</span>
          </Button>
          <Button size="sm" onClick={() => setFinishOpen(true)}>
            <Flag className="h-4 w-4" /> Finalizar
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {perExercise.length === 0 ? (
          <EmptyState title="Sessão vazia" description="Adicione exercícios para começar a registrar séries." />
        ) : null}
        {perExercise.map(({ se, exercise, last, suggestion }, idx) => (
          <WorkoutExerciseCard
            key={se.id}
            index={idx}
            se={se}
            exercise={exercise}
            settings={settings}
            last={last}
            suggestion={suggestion}
            onChange={updateExercise}
            onSetCompleted={(secs) => {
              restLabelRef.current = se.exerciseName;
              setRestDuration(secs);
              setRestToken((t) => t + 1);
            }}
            onRemove={() => setRemoveId(se.id)}
            onReplace={() => setReplaceId(se.id)}
            onInvalidComplete={(m) => toast.warning(m)}
          />
        ))}
        <Button variant="outline" className="w-full" onClick={() => setPickerOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar exercício
        </Button>

        <Card>
          <label htmlFor="session-notes" className="label mb-2 block">
            Observações da sessão
          </label>
          <Textarea
            id="session-notes"
            placeholder="Como foi o treino? Sono, energia, dores, ajustes…"
            value={session.notes}
            onChange={(e) => actions.updateActiveSession((s) => ({ ...s, notes: e.target.value }))}
          />
        </Card>
        <div className="space-y-1 text-center text-xs text-muted">
          <p>Progresso salvo automaticamente.</p>
          {wakeLock === "ativo" ? (
            <p className="inline-flex items-center gap-1">
              <Sun className="h-3.5 w-3.5" /> Tela mantida acesa durante o treino.
            </p>
          ) : null}
          {!notificationsOn ? (
            <p>
              <Link href="/perfil" className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
                <BellRing className="h-3.5 w-3.5" /> Ativar notificação de fim de descanso
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      {/* Cronômetro fixo */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 safe-bottom lg:left-64">
        <div className="mx-auto max-w-6xl">
          <RestTimer duration={restDuration} onDurationChange={setRestDuration} startToken={restToken} sound={settings.restTimerSound} notifier={restNotifier} />
        </div>
      </div>

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addExercise} title="Adicionar exercício à sessão" />
      <ExercisePicker
        open={replaceId !== null}
        onClose={() => setReplaceId(null)}
        onSelect={replaceExercise}
        title="Substituir exercício"
        description="Séries já concluídas são mantidas; as cargas das séries pendentes são limpas."
        excludeIds={replaceId ? [session.exercises.find((e) => e.id === replaceId)?.exerciseId ?? ""] : []}
      />

      <ConfirmDialog
        open={removeId !== null}
        onClose={() => setRemoveId(null)}
        title="Remover exercício da sessão?"
        description="As séries registradas neste exercício nesta sessão serão perdidas."
        confirmLabel="Remover"
        destructive
        onConfirm={() => {
          actions.updateActiveSession((s) => ({ ...s, exercises: s.exercises.filter((e) => e.id !== removeId) }));
          setRemoveId(null);
        }}
      />

      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Descartar esta sessão?"
        description={`${summary.completedSets} série(s) registrada(s) serão perdidas. Esta ação não pode ser desfeita.`}
        confirmLabel="Descartar treino"
        destructive
        onConfirm={() => {
          actions.discardActiveSession();
          setDiscardOpen(false);
          toast.info("Sessão descartada.");
          router.push("/");
        }}
      />

      <Dialog
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Finalizar treino"
        description="Séries não concluídas e exercícios sem registro serão salvos como incompletos/ignorados."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFinishOpen(false)}>
              Continuar treinando
            </Button>
            <Button onClick={finish} data-autofocus disabled={!manualValid}>
              <CheckCircle2 className="h-4 w-4" /> Salvar treino
            </Button>
          </>
        }
      >
        {forgotten ? (
          <div className="mb-4 rounded-xl border border-warn/40 bg-warn/10 p-3">
            <p className="flex items-start gap-2 text-sm text-warn">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Esta sessão ficou aberta por {formatDuration(elapsed)}. Informe quanto tempo o treino durou de verdade; o início ({formatDateTime(session.startedAt)}) é mantido.
            </p>
            <Field label="Duração real (minutos)" htmlFor="finish-duration" className="mt-3" error={manualValid ? undefined : `Entre 1 e ${MAX_SESSION_MINUTES} minutos.`}>
              <Input
                id="finish-duration"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_SESSION_MINUTES}
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
              />
            </Field>
          </div>
        ) : null}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs text-muted">Duração</dt>
            <dd className="text-lg font-bold tabular">{forgotten && manualValid ? formatMinutes(manualMinutesNumber) : formatDuration(elapsed)}</dd>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs text-muted">Séries válidas</dt>
            <dd className="text-lg font-bold tabular">
              {summary.completedSets}/{summary.plannedSets}
            </dd>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs text-muted">Volume</dt>
            <dd className="text-lg font-bold tabular">{formatWeight(sessionVolumeKg(session), settings.unit)}</dd>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs text-muted">Ignorados</dt>
            <dd className="text-lg font-bold tabular">{summary.skippedExercises + summary.exercisesWithoutSets}</dd>
          </div>
        </dl>
        <fieldset className="mt-4">
          <legend className="mb-1.5 text-sm font-medium">Como você se sentiu? (opcional)</legend>
          <div className="flex gap-1.5" role="radiogroup">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={feeling === n}
                aria-label={`${n} de 5`}
                onClick={() => setFeeling(feeling === n ? undefined : n)}
                className={`h-10 flex-1 rounded-lg border text-sm font-semibold transition-colors ${feeling === n ? "border-accent bg-accent/15 text-accent" : "border-line bg-surface-2 text-muted hover:text-fg"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">1 = exausto · 5 = ótimo</p>
        </fieldset>
        {summary.completedSets === 0 ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-warn/10 p-2 text-xs text-warn">
            <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Nenhuma série válida foi registrada. Você pode salvar mesmo assim, mas a sessão não contará volume.
          </p>
        ) : null}
      </Dialog>
    </div>
  );
}
