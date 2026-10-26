import type { Routine, RoutineDay, Prescription, Weekday } from "@/types";
import { DEFAULT_EXERCISES } from "./exercises";

const BASE_DATE = "2024-01-01T00:00:00.000Z";

type P = [exerciseId: string, sets: number, repMin: number, repMax: number, notes?: string];

function rest(exerciseId: string): number {
  return DEFAULT_EXERCISES.find((e) => e.id === exerciseId)?.defaultRestSeconds ?? 90;
}

function prescriptions(dayId: string, list: P[]): Prescription[] {
  return list.map(([exerciseId, sets, repMin, repMax, notes], i) => {
    const ex = DEFAULT_EXERCISES.find((e) => e.id === exerciseId);
    if (!ex) throw new Error(`Exercício inexistente na rotina inicial: ${exerciseId}`);
    return {
      id: `${dayId}-p${i + 1}-${exerciseId}`,
      exerciseId,
      sets,
      repMin,
      repMax,
      restSeconds: rest(exerciseId),
      notes,
    };
  });
}

function day(weekday: Weekday, name: string, focus: string, list: P[] | null): RoutineDay {
  const id = `day-${weekday}`;
  return {
    id,
    weekday,
    name,
    focus,
    type: list ? "treino" : "descanso",
    prescriptions: list ? prescriptions(id, list) : [],
  };
}

/** Rotina inicial definida no briefing. Pode ser restaurada a qualquer momento. */
export function createDefaultRoutine(): Routine {
  return {
    id: "routine-default",
    name: "Rotina Hipertrofia — 5 dias",
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    days: [
      day(1, "Push", "Peito, ombros e tríceps", [
        ["supino-reto-barra", 3, 6, 10],
        ["supino-inclinado-halteres", 3, 8, 12],
        ["crucifixo-maquina", 2, 10, 15],
        ["desenvolvimento-maquina", 2, 8, 12],
        ["elevacao-lateral", 3, 12, 20],
        ["triceps-corda-polia", 3, 10, 15],
        ["triceps-acima-cabeca-polia", 2, 10, 15],
      ]),
      day(2, "Pull", "Costas e bíceps", [
        ["puxada-alta-frente", 3, 8, 12],
        ["remada-apoio-peito", 3, 8, 12],
        ["remada-unilateral-polia", 2, 10, 15],
        ["pulldown-bracos-estendidos", 2, 12, 15],
        ["crucifixo-inverso-maquina", 3, 12, 20],
        ["rosca-direta-ez", 3, 8, 12],
        ["rosca-inclinada-halteres", 2, 10, 15],
      ]),
      day(3, "Pernas A", "Ênfase em quadríceps", [
        ["agachamento-livre", 3, 6, 10, "Alternativa: hack squat (use o botão de substituir exercício)."],
        ["leg-press", 3, 10, 15],
        ["cadeira-extensora", 2, 12, 15],
        ["mesa-flexora", 3, 10, 15],
        ["hip-thrust", 2, 8, 12],
        ["panturrilha-em-pe", 3, 10, 15],
        ["abdominal-polia", 3, 10, 15],
      ]),
      day(4, "Descanso", "Recuperação ativa", null),
      day(5, "Superior B", "Peito, costas e deltoides", [
        ["supino-inclinado-maquina", 3, 8, 12],
        ["crossover-polia", 2, 12, 15],
        ["remada-baixa-polia", 3, 8, 12],
        ["puxada-neutra", 2, 10, 12],
        ["elevacao-lateral-polia", 3, 12, 20],
        ["crucifixo-inverso-maquina", 2, 12, 20],
      ]),
      day(6, "Pernas B e Braços", "Posteriores, glúteos e braços", [
        ["levantamento-terra-romeno", 3, 6, 10],
        ["mesa-flexora", 3, 10, 15],
        ["cadeira-extensora", 2, 12, 15],
        ["hip-thrust", 2, 8, 12, "Alternativa: extensão de quadril na polia."],
        ["panturrilha-sentada", 3, 12, 20],
        ["rosca-scott", 2, 10, 15],
        ["triceps-corda-polia", 2, 10, 15],
        ["prancha", 3, 30, 60, "Registre os segundos no campo de repetições."],
      ]),
      day(7, "Descanso", "Resumo semanal e recuperação", null),
    ],
  };
}
