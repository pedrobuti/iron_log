"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Exercise, MuscleGroup } from "@/types";
import { EQUIPMENTS, MOVEMENT_TYPES, MUSCLE_GROUPS } from "@/types";
import { exerciseFormSchema, type ExerciseFormValues } from "@/lib/validation/schemas";
import { EQUIPMENT_LABELS, MOVEMENT_LABELS, MUSCLE_LABELS } from "@/lib/labels";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/field";

const EMPTY: ExerciseFormValues = {
  name: "",
  primaryMuscle: "peito",
  secondaryMuscles: [],
  equipment: "maquina",
  movementType: "isolado",
  measure: "reps",
  isUnilateral: false,
  defaultRepMin: 8,
  defaultRepMax: 12,
  defaultSets: 3,
  defaultRestSeconds: 90,
  technique: "",
};

export function ExerciseForm({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Exercise | null;
  onSubmit: (values: ExerciseFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      initial
        ? {
            name: initial.name,
            primaryMuscle: initial.primaryMuscle,
            secondaryMuscles: initial.secondaryMuscles,
            equipment: initial.equipment,
            movementType: initial.movementType,
            measure: initial.measure,
            isUnilateral: initial.isUnilateral,
            defaultRepMin: initial.defaultRepMin,
            defaultRepMax: initial.defaultRepMax,
            defaultSets: initial.defaultSets,
            defaultRestSeconds: initial.defaultRestSeconds,
            technique: initial.technique ?? "",
          }
        : EMPTY,
    );
  }, [open, initial, reset]);

  const primary = watch("primaryMuscle");
  const measure = watch("measure");
  const readOnlyCore = Boolean(initial && !initial.isCustom);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? (readOnlyCore ? "Ajustar exercício padrão" : "Editar exercício") : "Novo exercício"}
      description={
        readOnlyCore
          ? "Em exercícios da biblioteca padrão você pode ajustar músculos, descanso, faixa de repetições e observações. Nome e equipamento ficam fixos."
          : "Preencha os dados do exercício. O histórico de treinos fica associado ao exercício mesmo que você edite a prescrição depois."
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="exercise-form" type="submit" loading={isSubmitting}>
            {initial ? "Salvar alterações" : "Criar exercício"}
          </Button>
        </>
      }
    >
      <form id="exercise-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Nome" htmlFor="ex-name" error={errors.name?.message} className="sm:col-span-2">
          <Input id="ex-name" {...register("name")} invalid={Boolean(errors.name)} disabled={readOnlyCore} data-autofocus />
        </Field>

        <Field label="Músculo principal" htmlFor="ex-primary" error={errors.primaryMuscle?.message}>
          <Select id="ex-primary" {...register("primaryMuscle")}>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Equipamento" htmlFor="ex-equipment">
          <Select id="ex-equipment" {...register("equipment")} disabled={readOnlyCore}>
            {EQUIPMENTS.map((e) => (
              <option key={e} value={e}>
                {EQUIPMENT_LABELS[e]}
              </option>
            ))}
          </Select>
        </Field>

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium">Músculos auxiliares (participação indireta)</p>
          <Controller
            control={control}
            name="secondaryMuscles"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl border border-line p-3 sm:grid-cols-3">
                {MUSCLE_GROUPS.filter((m) => m !== primary).map((m: MuscleGroup) => (
                  <Checkbox
                    key={m}
                    id={`sec-${m}`}
                    label={MUSCLE_LABELS[m]}
                    checked={field.value.includes(m)}
                    onChange={(c) => field.onChange(c ? [...field.value, m] : field.value.filter((x) => x !== m))}
                  />
                ))}
              </div>
            )}
          />
          <p className="mt-1 text-xs text-muted">Cada série conta 1,0 para o músculo principal e 0,5 para cada auxiliar no volume semanal.</p>
        </div>

        <Field label="Tipo de movimento" htmlFor="ex-movement">
          <Select id="ex-movement" {...register("movementType")}>
            {MOVEMENT_TYPES.map((m) => (
              <option key={m} value={m}>
                {MOVEMENT_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Medida da série" htmlFor="ex-measure">
          <Select id="ex-measure" {...register("measure")} disabled={readOnlyCore}>
            <option value="reps">Repetições</option>
            <option value="time">Tempo (segundos)</option>
          </Select>
        </Field>

        <Field label="Séries padrão" htmlFor="ex-sets" error={errors.defaultSets?.message}>
          <Input id="ex-sets" type="number" inputMode="numeric" min={1} max={20} {...register("defaultSets", { valueAsNumber: true })} invalid={Boolean(errors.defaultSets)} />
        </Field>

        <Field label="Descanso (segundos)" htmlFor="ex-rest" error={errors.defaultRestSeconds?.message}>
          <Input id="ex-rest" type="number" inputMode="numeric" min={0} max={900} step={5} {...register("defaultRestSeconds", { valueAsNumber: true })} invalid={Boolean(errors.defaultRestSeconds)} />
        </Field>

        <Field label={measure === "time" ? "Mínimo (segundos)" : "Repetições mínimas"} htmlFor="ex-repmin" error={errors.defaultRepMin?.message}>
          <Input id="ex-repmin" type="number" inputMode="numeric" min={1} {...register("defaultRepMin", { valueAsNumber: true })} invalid={Boolean(errors.defaultRepMin)} />
        </Field>

        <Field label={measure === "time" ? "Máximo (segundos)" : "Repetições máximas"} htmlFor="ex-repmax" error={errors.defaultRepMax?.message}>
          <Input id="ex-repmax" type="number" inputMode="numeric" min={1} {...register("defaultRepMax", { valueAsNumber: true })} invalid={Boolean(errors.defaultRepMax)} />
        </Field>

        <div className="sm:col-span-2">
          <Controller
            control={control}
            name="isUnilateral"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onChange={field.onChange}
                label="Exercício unilateral"
                description="Uma série registrada = os dois lados. Carga e repetições por lado; tonelagem ×2."
              />
            )}
          />
        </div>

        <Field label="Observações técnicas" htmlFor="ex-technique" error={errors.technique?.message} className="sm:col-span-2">
          <Textarea id="ex-technique" {...register("technique")} placeholder="Dicas de execução, ajustes de máquina, pegada…" />
        </Field>
      </form>
    </Dialog>
  );
}
