import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  unit,
  hint,
  icon,
  tone = "default",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "accent";
  className?: string;
}) {
  return (
    <div className={cn("card flex flex-col gap-1 p-4", tone === "accent" && "border-accent/30 bg-accent/5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="label">{label}</span>
        {icon ? <span className="text-muted">{icon}</span> : null}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular leading-none sm:text-3xl">{value}</span>
        {unit ? <span className="text-sm text-muted">{unit}</span> : null}
      </div>
      {hint ? <div className="text-xs text-muted">{hint}</div> : null}
    </div>
  );
}
