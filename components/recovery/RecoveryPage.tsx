"use client";

import { useMemo } from "react";
import { AlertTriangle, CalendarClock, HeartPulse, Info } from "lucide-react";
import { useApp } from "@/lib/store/AppProvider";
import { computeRecovery, RECOVERY_DISCLAIMER, RECOVERY_TIPS, type RecoveryLevel } from "@/lib/recovery";
import { WEEKDAY_SHORT, formatDateTime, isoWeekday } from "@/lib/dates";
import { formatWeight } from "@/lib/units";
import { round } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LEVEL_TONE: Record<RecoveryLevel, BadgeTone> = {
  "sem-registro": "neutral",
  recente: "danger",
  intermediario: "warn",
  provavel: "info",
  longo: "accent",
};

const LEVEL_BAR: Record<RecoveryLevel, string> = {
  "sem-registro": "bg-line w-0",
  recente: "bg-danger w-1/4",
  intermediario: "bg-warn w-2/4",
  provavel: "bg-info w-3/4",
  longo: "bg-accent w-full",
};

export function RecoveryPage() {
  const { data } = useApp();
  const now = new Date();
  const recovery = useMemo(
    () => computeRecovery({ sessions: data.sessions, routine: data.routine, exercises: data.exercises, now }),
    [data.sessions, data.routine, data.exercises], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const withData = recovery.filter((r) => r.lastStimulusAt !== null).sort((a, b) => (a.hoursSince ?? 0) - (b.hoursSince ?? 0));
  const without = recovery.filter((r) => r.lastStimulusAt === null);
  const warnings = recovery.flatMap((r) => r.warnings);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Recuperação" subtitle="Estimativas por grupo muscular a partir dos seus registros" />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-info/30 bg-info/10 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p className="text-fg/90">{RECOVERY_DISCLAIMER}</p>
      </div>

      {warnings.length > 0 ? (
        <Card className="mb-5 border-warn/40">
          <CardHeader title="Atenção a sessões consecutivas" icon={<AlertTriangle className="h-4 w-4 text-warn" />} />
          <ul className="space-y-1.5 text-sm">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" aria-hidden />
                {w}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {withData.length === 0 ? (
        <Card className="mb-5">
          <p className="text-sm text-muted">Nenhum estímulo registrado ainda. Conclua um treino para ver as estimativas por músculo.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {withData.map((r) => (
            <Card key={r.muscle} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{r.label}</h2>
                  <p className="text-xs text-muted">
                    Último estímulo {r.lastStimulusRole === "direta" ? "direto" : "indireto"} · {r.lastSessionName}
                  </p>
                </div>
                <Badge tone={LEVEL_TONE[r.level]}>{r.hoursSince !== null ? `${Math.floor(r.hoursSince)}h` : "—"}</Badge>
              </div>
              <div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <div className={cn("h-full rounded-full transition-all", LEVEL_BAR[r.level])} />
                </div>
                <p className="mt-1 text-xs text-muted">{r.levelLabel}</p>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-surface-2 p-2">
                  <dt className="text-muted">Último registro</dt>
                  <dd className="font-medium">{r.lastStimulusAt ? formatDateTime(r.lastStimulusAt) : "—"}</dd>
                </div>
                <div className="rounded-lg bg-surface-2 p-2">
                  <dt className="text-muted">Próxima sessão</dt>
                  <dd className="flex items-center gap-1 font-medium">
                    <CalendarClock className="h-3 w-3" />
                    {r.nextScheduled ? `${WEEKDAY_SHORT[isoWeekday(r.nextScheduled.date)]} · ${r.nextScheduled.dayName}` : "não programada"}
                  </dd>
                </div>
                <div className="rounded-lg bg-surface-2 p-2">
                  <dt className="text-muted">Séries (7 dias)</dt>
                  <dd className="font-medium tabular">{round(r.recentSets7d, 1)} ponderadas</dd>
                </div>
                <div className="rounded-lg bg-surface-2 p-2">
                  <dt className="text-muted">Tonelagem (7 dias)</dt>
                  <dd className="font-medium tabular">{formatWeight(r.recentTonnage7dKg, data.settings.unit)}</dd>
                </div>
              </dl>
              {r.warnings.length > 0 ? (
                <p className="flex items-start gap-1.5 text-xs text-warn">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {r.warnings[0]}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {without.length > 0 ? (
        <p className="mt-4 text-xs text-muted">
          Sem registros: {without.map((r) => r.label).join(", ")}.
        </p>
      ) : null}

      <Card className="mt-6">
        <CardHeader title="Como avaliar a recuperação de verdade" subtitle="O tempo é só um dos sinais" icon={<HeartPulse className="h-4 w-4" />} />
        <ul className="space-y-2 text-sm">
          {RECOVERY_TIPS.map((t) => (
            <li key={t} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              <span className="text-fg/90">{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          A associação de exercícios a músculos (direta/indireta) pode ser ajustada na biblioteca de exercícios e impacta estes indicadores.
        </p>
      </Card>
    </div>
  );
}
