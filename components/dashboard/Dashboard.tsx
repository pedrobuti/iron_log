"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { addDays } from "date-fns";
import { ArrowRight, CalendarDays, Clock, Dumbbell, Flame, HeartPulse, Moon, Play, TrendingDown, TrendingUp, Minus, Zap } from "lucide-react";
import { useApp } from "@/lib/store/AppProvider";
import { WEEKDAY_SHORT, formatDateLong, formatRelativeDays, greeting, isoWeekday, orderedWeekdays, startOfTrainingWeek, toDateKey } from "@/lib/dates";
import { currentWeekSummary, frequencyTarget, lastCompletedSession, sessionsByDateKey, trainingStreak } from "@/lib/stats";
import { computeRecovery, RECOVERY_DISCLAIMER, type RecoveryLevel } from "@/lib/recovery";
import { exerciseHistory, topWeight } from "@/lib/progression";
import { formatWeight, toDisplayWeight } from "@/lib/units";
import { formatMinutes, formatNumber } from "@/lib/utils";
import { sessionEffectiveSets, sessionVolumeKg } from "@/lib/volume";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const LEVEL_TONE: Record<RecoveryLevel, string> = {
  "sem-registro": "bg-line",
  recente: "bg-danger",
  intermediario: "bg-warn",
  provavel: "bg-info",
  longo: "bg-accent",
};

export function Dashboard() {
  const { data, actions, isFirstRun } = useApp();
  const router = useRouter();
  const toast = useToast();
  const now = new Date();
  const todayWd = isoWeekday(now);
  const { settings, routine, sessions, activeSession } = data;

  const today = routine.days.find((d) => d.weekday === todayWd);
  const todaySessions = sessionsByDateKey(sessions).get(toDateKey(now)) ?? [];
  const trainedToday = todaySessions.length > 0;

  const week = useMemo(() => currentWeekSummary(sessions, settings.weekStartsOn, now), [sessions, settings.weekStartsOn]); // eslint-disable-line react-hooks/exhaustive-deps
  const target = frequencyTarget(settings, routine);
  const streak = useMemo(() => trainingStreak(sessions, routine, now), [sessions, routine]); // eslint-disable-line react-hooks/exhaustive-deps
  const last = lastCompletedSession(sessions);

  const recovery = useMemo(
    () => computeRecovery({ sessions, routine, exercises: data.exercises, now }).filter((r) => r.lastStimulusAt !== null),
    [sessions, routine, data.exercises], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const loadTrend = useMemo(() => {
    if (!last) return [];
    return last.exercises
      .map((se) => {
        const hist = exerciseHistory(sessions, se.exerciseId);
        const cur = hist[0];
        const prev = hist[1];
        if (!cur || !prev) return null;
        const a = topWeight(cur.exercise);
        const b = topWeight(prev.exercise);
        if (a === null || b === null) return null;
        return { id: se.exerciseId, name: se.exerciseName, current: a, delta: a - b };
      })
      .filter((x): x is { id: string; name: string; current: number; delta: number } => x !== null)
      .slice(0, 4);
  }, [last, sessions]);

  const upcoming = useMemo(() => {
    const order = orderedWeekdays(settings.weekStartsOn);
    const weekStart = startOfTrainingWeek(now, settings.weekStartsOn);
    return order
      .map((wd, i) => ({ day: routine.days.find((d) => d.weekday === wd), date: addDays(weekStart, i) }))
      .filter((x) => x.day && x.day.type === "treino" && x.date > now)
      .slice(0, 4) as { day: NonNullable<(typeof routine.days)[number]>; date: Date }[];
  }, [routine.days, settings.weekStartsOn]); // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    if (activeSession) return router.push("/treino");
    if (!today || today.type !== "treino") return;
    const s = actions.startSession(today.id);
    if (!s) return toast.error("Não foi possível iniciar o treino.");
    router.push("/treino");
  }

  function startFree() {
    actions.startFreeSession("Treino livre");
    router.push("/treino");
  }

  const name = settings.displayName.trim();

  return (
    <div className="space-y-6 animate-fade-up">
      <header>
        <p className="label">{formatDateLong(now)}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting(now)}
          {name ? `, ${name}` : ""}.
        </h1>
        {isFirstRun ? (
          <p className="mt-1 text-sm text-muted">
            Bem-vindo ao IronLog. Sua rotina de 5 dias já está configurada em{" "}
            <Link href="/semana" className="text-accent hover:underline">
              Minha semana
            </Link>
            .
          </p>
        ) : null}
      </header>

      {/* Treino do dia */}
      <Card className={cn("relative overflow-hidden", today?.type === "treino" && "border-accent/40")}>
        {today?.type === "treino" ? (
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent/10 blur-3xl" aria-hidden />
        ) : null}
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="label">{activeSession ? "Em andamento" : "Treino de hoje"}</p>
            <h2 className="mt-1 text-xl font-bold">{activeSession ? activeSession.dayName : today?.type === "treino" ? today.name : "Descanso"}</h2>
            <p className="mt-0.5 text-sm text-muted">
              {activeSession
                ? `${activeSession.exercises.length} exercícios · iniciado ${formatRelativeDays(activeSession.startedAt)}`
                : today?.type === "treino"
                  ? `${today.focus} · ${today.prescriptions.length} exercícios · ${today.prescriptions.reduce((a, p) => a + p.sets, 0)} séries`
                  : today?.focus ?? "Dia livre"}
            </p>
            {trainedToday && !activeSession ? (
              <Badge tone="accent" className="mt-2">
                <Zap className="h-3 w-3" /> Treino de hoje concluído
              </Badge>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {activeSession ? (
              <Button size="lg" onClick={() => router.push("/treino")}>
                <Play className="h-5 w-5 fill-current" /> Retomar treino
              </Button>
            ) : today?.type === "treino" ? (
              <Button size="lg" onClick={start}>
                <Play className="h-5 w-5 fill-current" /> {trainedToday ? "Treinar novamente" : "Iniciar treino"}
              </Button>
            ) : (
              <>
                <Button size="lg" variant="secondary" onClick={() => router.push("/semana")}>
                  <Moon className="h-5 w-5" /> Registrar recuperação
                </Button>
                <Button size="lg" variant="outline" onClick={startFree}>
                  <Dumbbell className="h-5 w-5" /> Treino livre
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Indicadores da semana */}
      <section aria-labelledby="week-stats">
        <h2 id="week-stats" className="sr-only">
          Indicadores da semana
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Treinos na semana" value={week.sessions} unit={`/ ${target}`} icon={<CalendarDays className="h-4 w-4" />} hint={<ProgressBar value={target ? (week.sessions / target) * 100 : 0} label="Frequência semanal" className="mt-1" />} />
          <Stat label="Volume na semana" value={formatNumber(Math.round(toDisplayWeight(week.volumeKg, settings.unit)))} unit={settings.unit} icon={<Dumbbell className="h-4 w-4" />} hint={`${week.sets} séries efetivas`} />
          <Stat label="Tempo médio" value={week.sessions ? formatMinutes(week.avgDurationMin) : "—"} icon={<Clock className="h-4 w-4" />} hint={week.sessions ? `${formatMinutes(week.totalDurationMin)} no total` : "sem sessões esta semana"} />
          <Stat label="Sequência" value={streak} unit={streak === 1 ? "treino" : "treinos"} icon={<Flame className="h-4 w-4" />} hint="dias programados cumpridos em sequência" tone={streak >= 3 ? "accent" : "default"} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Último treino */}
        <Card>
          <CardHeader title="Último treino" subtitle={last ? `${last.dayName} · ${formatRelativeDays(last.startedAt)}` : "Nenhum treino concluído ainda"} icon={<Dumbbell className="h-4 w-4" />} action={last ? <Link href={`/historico?sessao=${last.id}`} className="text-xs font-medium text-accent hover:underline">Ver detalhes</Link> : null} />
          {last ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-surface-2 p-3">
                <p className="text-lg font-bold tabular">{formatMinutes(last.durationSeconds / 60)}</p>
                <p className="text-xs text-muted">duração</p>
              </div>
              <div className="rounded-xl bg-surface-2 p-3">
                <p className="text-lg font-bold tabular">{sessionEffectiveSets(last)}</p>
                <p className="text-xs text-muted">séries</p>
              </div>
              <div className="rounded-xl bg-surface-2 p-3">
                <p className="text-lg font-bold tabular">{formatWeight(sessionVolumeKg(last), settings.unit, false)}</p>
                <p className="text-xs text-muted">{settings.unit} volume</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Conclua um treino para ver o resumo aqui.</p>
          )}
        </Card>

        {/* Evolução das cargas */}
        <Card>
          <CardHeader title="Evolução das cargas" subtitle="Carga máxima vs. sessão anterior do mesmo exercício" icon={<TrendingUp className="h-4 w-4" />} action={<Link href="/progressao" className="text-xs font-medium text-accent hover:underline">Progressão</Link>} />
          {loadTrend.length === 0 ? (
            <p className="text-sm text-muted">Após duas sessões do mesmo exercício, a comparação aparece aqui.</p>
          ) : (
            <ul className="divide-y divide-line">
              {loadTrend.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate">{t.name}</span>
                  <span className="flex items-center gap-2 tabular">
                    <span className="font-medium">{formatWeight(t.current, settings.unit)}</span>
                    <span className={cn("flex items-center gap-0.5 text-xs", t.delta > 0 ? "text-accent" : t.delta < 0 ? "text-danger" : "text-muted")}>
                      {t.delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : t.delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                      {t.delta > 0 ? "+" : ""}
                      {formatWeight(t.delta, settings.unit, false)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Próximos treinos */}
        <Card>
          <CardHeader title="Próximos treinos" subtitle="Restantes nesta semana" icon={<CalendarDays className="h-4 w-4" />} action={<Link href="/semana" className="text-xs font-medium text-accent hover:underline">Minha semana</Link>} />
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Nenhum treino restante nesta semana. Próximo ciclo começa {WEEKDAY_SHORT[settings.weekStartsOn]}.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map(({ day, date }) => (
                <li key={day.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
                  <span className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-surface-2 text-xs font-semibold">
                    <span className="text-muted">{WEEKDAY_SHORT[day.weekday]}</span>
                    <span>{date.getDate()}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{day.name}</p>
                    <p className="truncate text-xs text-muted">{day.focus} · {day.prescriptions.length} exercícios</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recuperação */}
        <Card>
          <CardHeader title="Recuperação estimada" subtitle="Tempo desde o último estímulo registrado" icon={<HeartPulse className="h-4 w-4" />} action={<Link href="/recuperacao" className="text-xs font-medium text-accent hover:underline">Detalhes</Link>} />
          {recovery.length === 0 ? (
            <p className="text-sm text-muted">Sem estímulos registrados. Conclua um treino para ver as estimativas por grupo muscular.</p>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {recovery
                  .sort((a, b) => (a.hoursSince ?? 0) - (b.hoursSince ?? 0))
                  .slice(0, 9)
                  .map((r) => (
                    <li key={r.muscle} className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-2 text-xs">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", LEVEL_TONE[r.level])} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{r.label}</span>
                      <span className="tabular text-muted">{r.hoursSince !== null ? `${Math.floor(r.hoursSince)}h` : "—"}</span>
                    </li>
                  ))}
              </ul>
              <p className="mt-3 text-[11px] leading-snug text-muted">{RECOVERY_DISCLAIMER}</p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
