import type { Equipment, ExperienceLevel, Goal, MovementType, MuscleGroup } from "@/types";

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  peito: "Peito",
  costas: "Costas",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  quadriceps: "Quadríceps",
  posteriores: "Posteriores",
  gluteos: "Glúteos",
  panturrilhas: "Panturrilhas",
  abdomen: "Abdômen",
  antebracos: "Antebraços",
  trapezio: "Trapézio",
  lombar: "Lombar",
};

/** Músculos considerados "membros inferiores" para incrementos maiores de carga. */
export const LOWER_BODY: ReadonlySet<MuscleGroup> = new Set<MuscleGroup>([
  "quadriceps",
  "posteriores",
  "gluteos",
  "panturrilhas",
]);

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barra: "Barra",
  halteres: "Halteres",
  maquina: "Máquina",
  polia: "Polia",
  "peso-corporal": "Peso corporal",
  kettlebell: "Kettlebell",
  elastico: "Elástico",
  outro: "Outro",
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  "empurrar-horizontal": "Empurrar horizontal",
  "empurrar-vertical": "Empurrar vertical",
  "puxar-horizontal": "Puxar horizontal",
  "puxar-vertical": "Puxar vertical",
  "dominante-joelho": "Dominante de joelho",
  "dominante-quadril": "Dominante de quadril",
  isolado: "Isolado",
  core: "Core",
  cardio: "Cardio",
};

export const GOAL_LABELS: Record<Goal, string> = {
  hipertrofia: "Hipertrofia",
  forca: "Força",
  recomposicao: "Recomposição corporal",
  saude: "Saúde e condicionamento",
};

export const LEVEL_LABELS: Record<ExperienceLevel, string> = {
  iniciante: "Iniciante (até 1 ano)",
  intermediario: "Intermediário (1–3 anos)",
  avancado: "Avançado (3+ anos)",
};
