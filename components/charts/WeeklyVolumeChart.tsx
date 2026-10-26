"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeightUnit } from "@/types";
import type { WeekSummary } from "@/lib/stats";
import { toDisplayWeight } from "@/lib/units";
import { formatDayMonth } from "@/lib/dates";
import { formatNumber } from "@/lib/utils";
import { AXIS_PROPS, CHART_COLORS, ChartEmpty, ChartTooltip } from "./chart-utils";

export function WeeklyVolumeChart({ weeks, unit }: { weeks: WeekSummary[]; unit: WeightUnit }) {
  if (weeks.every((w) => w.volumeKg === 0)) return <ChartEmpty message="Nenhum volume registrado nas semanas selecionadas." />;
  const data = weeks.map((w) => ({
    label: w.label,
    short: formatDayMonth(w.start),
    volume: Math.round(toDisplayWeight(w.volumeKg, unit)),
    sets: w.sets,
    sessions: w.sessions,
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="short" {...AXIS_PROPS} minTickGap={16} tick={{ ...AXIS_PROPS.tick, fontSize: 10 }} />
          <YAxis {...AXIS_PROPS} width={60} tickFormatter={(v: number) => formatNumber(v)} />
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
                    { name: "Volume", value: `${formatNumber(p.volume)} ${unit}`, color: CHART_COLORS.accent },
                    { name: "Séries efetivas", value: p.sets },
                    { name: "Sessões", value: p.sessions },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="volume" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
