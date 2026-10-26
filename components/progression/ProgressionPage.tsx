"use client";

import { useMemo, useState } from "react";
import { Lightbulb, Trophy, TrendingUp } from "lucide-react";
import { useApp, useExercisesById } from "@/lib/store/AppProvider";
import { comparePerformance, exerciseHistory, lastPerformance, suggestLoad, workingWeight } from "@/lib/progression";
import { computePersonalRecords } from "@/lib/records";
import { exerciseProgressSeries, weeklySeries } from "@/lib/stats";
import { endOfTrainingWeek, formatDateShort, startOfTrainingWeek } from "@/lib/dates";
import { MUSCLE_LABELS } from "@/lib/labels";
import { formatWeight } from "@/lib/units";
import { exerciseVolumeKg, muscleLoadForSessions, validSets } from "@/lib/volume";
import { sessionsInRange } from "@/lib/stats";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadProgressChart } from "@/components/charts/LoadProgressChart";
import { MuscleVolumeChart } from "@/components/charts/MuscleVolumeChart";
import { cn, round } from "@/lib/utils";

export function ProgressionPage() {
  const { data } = useApp();
  const exercisesById = useExercisesById();
  const { sessions, settings, routine } = data;
  const unit = settings.unit;
  const now = new Date();

  const trackable = useMemo(() => {
    const ids = new Set<string>();
    for (const s of sessions) for (const e of s.exercises) if (validSets(e).length > 0) ids.add(e.exerciseId);
    return [...ids]
      .map((id) => exercisesById.get(id) ?? { id, name: sessions.flatMap((s) => s.exercises).find((e) => e.exerciseId === id)?.exerciseName ?? id })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [sessions, exercisesById]);

  const [exerciseId, setExerciseId] = useState<string>("");
  const selectedId = exerciseId || trackable[0]?.id || "";
  const selected = exercisesById.get(selectedId);
  const series = useMemo(() => exerciseProgressSeries(sessions, selectedId), [sessions, selectedId]);
  const history = useMemo(() => exerciseHistory(sessions, selectedId), [sessions, selectedId]);

  const weekLoad = useMemo(() => {
    const list = sessionsInRange(sessions, startOfTrainingWeek(now, settings.weekStartsOn), endOfTrainingWeek(now, settings.weekStartsOn));
    return muscleLoadForSessions(list, exercisesById);
  }, [sessions, settings.weekStartsOn, exercisesById]); // eslint-disable-line react-hooks/exhaustive-deps

  const weeks = useMemo(() => weeklySeries(sessions, 4, settings.weekStartsOn, now), [sessions, settings.weekStartsOn]); // eslint-disable-line react-hooks/exhaustive-deps
  const records = useMemo(() => computePersonalRecords(sessions), [sessions]);

  // Sugestões para o próximo treino de cada dia da rotina
  const nextSuggestions = useMemo(() => {
    return routine.days
      .filter((d) => d.type === "treino")
      .map((d) => ({
        day: d,
        items: d.prescriptions
          .map((p) => {
            const ex = exercisesById.get(p.exerciseId);
            if (!ex) return null;
            const last = lastPerformance(sessions, p.exerciseId);
            const s = suggestLoad({ last: last?.exercise ?? null, repMin: p.repMin, repMax: p.repMax, targetSets: p.sets, exercise: ex, settings });
            return { exercise: ex, suggestion: s, prescription: p };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null && x.suggestion.kind !== "sem-historico"),
      }))
      .filter((d) => d.items.length > 0);
  }, [routine.days, exercisesById, sessions, settings]);

  if (trackable.length === 0) {
    return (
      <div className="animate-fade-up">
        <PageHeader title="Progressão" subtitle="Progressão dupla: repetições primeiro, depois carga" />
        <EmptyState
          icon={<TrendingUp className="h-6 w-6" />}
          title="Ainda sem dados de progressão"
          description="Conclua treinos registrando carga e repetições para acompanhar a evolução e receber sugestões conservadoras de carga."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader title="Progressão" subtitle="Progressão dupla: suba as repetições na faixa; ao atingir o teto em todas as séries com RIR planejado, considere +carga." />

      <Card>
        <CardHeader title="Evolução de carga por exercício" subtitle="Carga máxima e 1RM estimado (Epley) por sessão" icon={<TrendingUp className="h-4 w-4" />} />
        <Select aria-label="Exercício" value={selectedId} onChange={(e) => setExerciseId(e.target.value)} className="mb-4 h-10 text-sm sm:max-w-sm">
          {trackable.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
        <LoadProgressChart points={series} unit={unit} />

        {history.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Data</th>
                  <th className="py-1.5 pr-3 font-medium">Séries</th>
                  <th className="py-1.5 pr-3 font-medium">Carga trab.</th>
                  <th className="py-1.5 pr-3 font-medium">Volume</th>
                  <th className="py-1.5 pr-3 font-medium">vs. anterior</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.slice(0, 8).map((h, i) => {
                  const prev = history[i + 1];
                  const cmp = prev ? comparePerformance(h.exercise, prev.exercise) : null;
                  return (
                    <tr key={h.exercise.id}>
                      <td className="py-1.5 pr-3 tabular">{formatDateShort(h.session.startedAt)}</td>
                      <td className="py-1.5 pr-3 tabular">{validSets(h.exercise).map((s) => `${s.weightKg === null ? "—" : formatWeight(s.weightKg, unit, false)}×${s.reps}${s.rir !== null ? `@${s.rir}` : ""}`).join("  ")}</td>
                      <td className="py-1.5 pr-3 tabular">{formatWeight(workingWeight(h.exercise), unit)}</td>
                      <td className="py-1.5 pr-3 tabular">{formatWeight(exerciseVolumeKg(h.exercise), unit)}</td>
                      <td className={cn("py-1.5 pr-3 tabular", cmp && cmp.volumeDeltaKg > 0 && "text-accent", cmp && cmp.volumeDeltaKg < 0 && "text-danger")}>
                        {cmp ? `${cmp.volumeDeltaKg > 0 ? "+" : ""}${formatWeight(cmp.volumeDeltaKg, unit, false)} vol · ${cmp.repsDelta > 0 ? "+" : ""}${cmp.repsDelta} reps${cmp.topWeightDeltaKg ? ` · ${cmp.topWeightDeltaKg > 0 ? "+" : ""}${formatWeight(cmp.topWeightDeltaKg, unit, false)} ${unit}` : ""}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {selected ? <p className="mt-3 text-xs text-muted">{MUSCLE_LABELS[selected.primaryMuscle]}{selected.isUnilateral ? " · unilateral (volume ×2, carga por lado)" : ""}</p> : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sugestões para os próximos treinos" subtitle="Baseadas na última execução de cada exercício. Aceite, ajuste ou ignore no treino." icon={<Lightbulb className="h-4 w-4" />} />
          {nextSuggestions.length === 0 ? (
            <p className="text-sm text-muted">Sem sugestões ainda. Registre cargas nos treinos para receber orientações.</p>
          ) : (
            <div className="space-y-3">
              {nextSuggestions.map(({ day, items }) => (
                <div key={day.id}>
                  <p className="label mb-1">{day.name}</p>
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {items.map(({ exercise, suggestion }) => (
                      <li key={exercise.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">{exercise.name}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <Badge tone={suggestion.kind === "aumentar" ? "accent" : suggestion.kind === "reduzir" ? "warn" : "info"}>
                            {suggestion.kind === "aumentar" ? "aumentar" : suggestion.kind === "reduzir" ? "reduzir" : "manter"}
                          </Badge>
                          <span className="tabular font-medium">{formatWeight(suggestion.weightKg, unit)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted">Aumentar carga nunca é obrigatório: se a técnica ou a recuperação estiverem comprometidas, mantenha ou reduza.</p>
        </Card>

        <Card>
          <CardHeader title="Volume semanal por grupo muscular" subtitle="Séries ponderadas nesta semana (direta 1,0 · indireta 0,5)" />
          <MuscleVolumeChart load={weekLoad} />
          <p className="mt-2 text-xs text-muted">
            Semanas anteriores: {weeks.slice(0, 3).map((w) => `${w.label}: ${w.sets} séries`).join(" · ")}. Volume externo não é uma medida direta de hipertrofia.
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recordes pessoais" subtitle="Maior carga, 1RM estimado e volume por sessão" icon={<Trophy className="h-4 w-4" />} />
        {records.length === 0 ? (
          <p className="text-sm text-muted">Registre cargas para ver recordes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-2 pr-3 font-medium">Exercício</th>
                  <th className="py-2 pr-3 font-medium">Carga máx.</th>
                  <th className="py-2 pr-3 font-medium">1RM est.</th>
                  <th className="py-2 pr-3 font-medium">Volume/sessão</th>
                  <th className="py-2 pr-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {records.map((r) => (
                  <tr key={r.exerciseId}>
                    <td className="py-2 pr-3 font-medium">{r.exerciseName}</td>
                    <td className="py-2 pr-3 tabular">
                      {formatWeight(r.maxWeightKg, unit)} × {r.maxWeightReps}
                    </td>
                    <td className="py-2 pr-3 tabular">{formatWeight(round(r.bestE1rmKg, 1), unit)}</td>
                    <td className="py-2 pr-3 tabular">{formatWeight(r.bestSessionVolumeKg, unit)}</td>
                    <td className="whitespace-nowrap py-2 pr-3 tabular text-muted">{formatDateShort(r.maxWeightDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
