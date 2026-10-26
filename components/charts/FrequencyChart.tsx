"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeekSummary } from "@/lib/stats";
import { formatDayMonth } from "@/lib/dates";
import { AXIS_PROPS, CHART_COLORS, ChartEmpty, ChartTooltip } from "./chart-utils";

export function FrequencyChart({ weeks, target }: { weeks: WeekSummary[]; target: number }) {
  if (weeks.every((w) => w.sessions === 0)) return <ChartEmpty message="Nenhuma sessão concluída nas semanas selecionadas." />;
  const data = weeks.map((w) => ({ label: w.label, short: formatDayMonth(w.start), sessions: w.sessions, minutes: w.totalDurationMin }));
  const max = Math.max(target, ...data.map((d) => d.sessions)) + 1;
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barCategoryGap="35%">
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="short" {...AXIS_PROPS} minTickGap={16} tick={{ ...AXIS_PROPS.tick, fontSize: 10 }} />
          <YAxis {...AXIS_PROPS} allowDecimals={false} domain={[0, max]} />
          <ReferenceLine y={target} stroke={CHART_COLORS.muted} strokeDasharray="4 4" label={{ value: `meta ${target}`, position: "insideTopRight", fill: CHART_COLORS.text, fontSize: 10 }} />
          <Tooltip
            cursor={{ fill: "rgb(var(--line) / 0.25)" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!p) return null;
              return (
                <ChartTooltip
                  active={active}
                  label={p.label}
                  rows={[
                    { name: "Sessões", value: p.sessions, color: CHART_COLORS.accent },
                    { name: "Tempo total", value: `${p.minutes} min` },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="sessions" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
