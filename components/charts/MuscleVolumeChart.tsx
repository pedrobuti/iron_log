"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MuscleGroup } from "@/types";
import type { MuscleLoad } from "@/lib/volume";
import { MUSCLE_LABELS } from "@/lib/labels";
import { round } from "@/lib/utils";
import { AXIS_PROPS, CHART_COLORS, ChartEmpty, ChartTooltip } from "./chart-utils";

/** Séries ponderadas por grupo muscular (direta 1,0 + indireta 0,5). Barras horizontais. */
export function MuscleVolumeChart({ load }: { load: Map<MuscleGroup, MuscleLoad> }) {
  const data = [...load.entries()]
    .filter(([, l]) => l.sets > 0)
    .map(([m, l]) => ({ muscle: MUSCLE_LABELS[m], sets: round(l.sets, 1), direct: l.directSets, indirect: l.indirectSets }))
    .sort((a, b) => b.sets - a.sets);
  if (data.length === 0) return <ChartEmpty message="Nenhuma série registrada no período." />;
  const height = Math.max(160, data.length * 28 + 24);
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} />
          <YAxis type="category" dataKey="muscle" {...AXIS_PROPS} width={84} />
          <Tooltip
            cursor={{ fill: "rgb(var(--line) / 0.25)" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!p) return null;
              return (
                <ChartTooltip
                  active={active}
                  label={p.muscle}
                  rows={[
                    { name: "Séries ponderadas", value: p.sets, color: CHART_COLORS.accent },
                    { name: "Diretas", value: p.direct },
                    { name: "Indiretas (×0,5)", value: p.indirect },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="sets" fill={CHART_COLORS.accent} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
