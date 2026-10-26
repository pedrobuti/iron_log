"use client";

import Image from "next/image";
import type { Exercise } from "@/types";
import { getDemo, DEMO_CREDIT } from "@/data/exercise-demos";
import { MUSCLE_LABELS } from "@/lib/labels";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function ExerciseDemoDialog({
  open,
  onClose,
  exerciseName,
  exercise,
  demoId,
}: {
  open: boolean;
  onClose: () => void;
  exerciseName: string;
  exercise?: Pick<Exercise, "primaryMuscle" | "secondaryMuscles" | "technique"> | undefined;
  demoId?: string | undefined;
}) {
  const demo = getDemo(demoId ?? null);
  if (!open) return null;
  return (
    <Dialog open={open} onClose={onClose} title={exerciseName} description={demo ? `Exemplo: ${demo.name}` : "Sem exemplo visual configurado"} size="lg">
      <div className="space-y-4">
        {demo ? (
          <div className="grid grid-cols-2 gap-2">
            {demo.images.map((src, i) => (
              <figure key={src} className="overflow-hidden rounded-xl border border-line bg-white">
                <Image src={src} alt={`${demo.name}: ${i === 0 ? "posição inicial" : "posição final"}`} width={640} height={480} className="h-auto w-full object-contain" unoptimized priority={i === 0} />
                <figcaption className="bg-surface-2 px-2 py-1 text-center text-[11px] text-muted">{i === 0 ? "Posição inicial" : "Posição final"}</figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
            Este exercício ainda não tem fotos de exemplo. Para exercícios personalizados, edite-o e escolha um exemplo semelhante na biblioteca.
          </p>
        )}

        {exercise ? (
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="accent">{MUSCLE_LABELS[exercise.primaryMuscle]}</Badge>
            {exercise.secondaryMuscles.map((m) => (
              <Badge key={m}>{MUSCLE_LABELS[m]}</Badge>
            ))}
          </div>
        ) : null}

        {demo ? (
          <ol className="space-y-2 text-sm">
            {demo.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">{i + 1}</span>
                <span className="text-fg/90">{s}</span>
              </li>
            ))}
          </ol>
        ) : null}

        {exercise?.technique ? (
          <div className="rounded-xl bg-surface-2 p-3 text-sm">
            <p className="label mb-1">Dica de técnica</p>
            <p className="text-fg/90">{exercise.technique}</p>
          </div>
        ) : null}

        {demo ? <p className="text-[11px] text-muted">{DEMO_CREDIT}</p> : null}
      </div>
    </Dialog>
  );
}
