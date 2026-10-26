"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeightUnit } from "@/types";
import type { ExerciseProgressPoint } from "@/lib/stats";
import { formatDateShort, formatDayMonth } from "@/lib/dates";
import { toDisplayWeight } from "@/lib/units";
import { AXIS_PROPS, CHART_COLORS, ChartEmpty, ChartTooltip, Legend } from "./chart-utils";

export function LoadProgressChart({ points, unit }: { points: ExerciseProgressPoint[]; unit: WeightUnit }) {
  if (points.length === 0) return <ChartEmpty message="Sem registros para este exercício ainda." />;
  const data = points.map((p) => ({
    date: p.date,
    label: formatDayMonth(p.date),
    carga: p.topWeightKg === null ? null : toDisplayWeight(p.topWeightKg, unit),
    e1rm: toDisplayWeight(p.e1rmKg, unit),
    reps: p.totalReps,
    sets: p.sets,
  }));
  return (
    <div>
      <Legend
        items={[
          { label: `Carga máxima (${unit})`, color: CHART_COLORS.accent },
          { label: `1RM estimado (${unit})`, color: CHART_COLORS.secondary },
        ]}
      />
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={24} />
            <YAxis {...AXIS_PROPS} width={56} domain={["auto", "auto"]} />
            <Tooltip
              cursor={{ stroke: CHART_COLORS.muted, strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
                if (!p) return null;
                return (
                  <ChartTooltip
                    active={active}
                    label={formatDateShort(p.date)}
                    rows={[
                      { name: "Carga máx.", value: p.carga === null ? "—" : `${p.carga} ${unit}`, color: CHART_COLORS.accent },
                      { name: "1RM est.", value: `${p.e1rm} ${unit}`, color: CHART_COLORS.secondary },
                      { name: "Séries × reps", value: `${p.sets} × ${p.reps}` },
                    ]}
                  />
                );
              }}
            />
            <Line type="monotone" dataKey="carga" stroke={CHART_COLORS.accent} strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: CHART_COLORS.accent }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} />
            <Line type="monotone" dataKey="e1rm" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: CHART_COLORS.secondary }} activeDot={{ r: 6 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
