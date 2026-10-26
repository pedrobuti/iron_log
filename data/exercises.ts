import type { Exercise, MuscleGroup, Equipment, MovementType, Measure } from "@/types";

/**
 * Biblioteca inicial de exercícios. IDs são slugs estáveis: nunca renomear,
 * pois o histórico de sessões referencia `exerciseId`.
 */

const BASE_DATE = "2024-01-01T00:00:00.000Z";

type Seed = {
  id: string;
  name: string;
  primary: MuscleGroup;
  secondary?: MuscleGroup[];
  equipment: Equipment;
  movement: MovementType;
  measure?: Measure;
  unilateral?: boolean;
  reps?: [number, number];
  sets?: number;
  rest?: number;
  technique?: string;
};

const seeds: Seed[] = [
  // ───── Peito ─────
  { id: "supino-reto-barra", name: "Supino reto com barra", primary: "peito", secondary: ["triceps", "ombros"], equipment: "barra", movement: "empurrar-horizontal", reps: [6, 10], sets: 3, rest: 150, technique: "Escápulas retraídas e deprimidas, pés firmes no chão. Desça a barra controlando até a linha do peito; não quique." },
  { id: "supino-inclinado-halteres", name: "Supino inclinado com halteres", primary: "peito", secondary: ["ombros", "triceps"], equipment: "halteres", movement: "empurrar-horizontal", reps: [8, 12], sets: 3, rest: 120, technique: "Banco entre 30° e 45°. Cotovelos levemente abaixo da linha dos ombros na descida." },
  { id: "supino-inclinado-maquina", name: "Supino inclinado na máquina", primary: "peito", secondary: ["ombros", "triceps"], equipment: "maquina", movement: "empurrar-horizontal", reps: [8, 12], sets: 3, rest: 120, technique: "Ajuste o assento para que as manoplas fiquem na linha do peito superior." },
  { id: "supino-reto-halteres", name: "Supino reto com halteres", primary: "peito", secondary: ["triceps", "ombros"], equipment: "halteres", movement: "empurrar-horizontal", reps: [8, 12], sets: 3, rest: 120 },
  { id: "crucifixo-maquina", name: "Crucifixo na máquina (peck deck)", primary: "peito", secondary: ["ombros"], equipment: "maquina", movement: "isolado", reps: [10, 15], sets: 2, rest: 90, technique: "Leve flexão nos cotovelos, foco em aproximar os braços sem projetar os ombros à frente." },
  { id: "crossover-polia", name: "Crossover na polia", primary: "peito", secondary: ["ombros"], equipment: "polia", movement: "isolado", reps: [12, 15], sets: 2, rest: 90, technique: "Mantenha leve inclinação do tronco e termine o movimento com as mãos à frente do peito." },
  { id: "flexao-bracos", name: "Flexão de braços", primary: "peito", secondary: ["triceps", "ombros", "abdomen"], equipment: "peso-corporal", movement: "empurrar-horizontal", reps: [8, 20], sets: 3, rest: 90 },
  { id: "mergulho-paralelas", name: "Mergulho nas paralelas", primary: "peito", secondary: ["triceps", "ombros"], equipment: "peso-corporal", movement: "empurrar-horizontal", reps: [6, 12], sets: 3, rest: 120 },

  // ───── Ombros ─────
  { id: "desenvolvimento-maquina", name: "Desenvolvimento de ombros na máquina", primary: "ombros", secondary: ["triceps"], equipment: "maquina", movement: "empurrar-vertical", reps: [8, 12], sets: 2, rest: 120, technique: "Não trave os cotovelos no topo; mantenha as costelas baixas e o core ativo." },
  { id: "desenvolvimento-halteres", name: "Desenvolvimento com halteres", primary: "ombros", secondary: ["triceps"], equipment: "halteres", movement: "empurrar-vertical", reps: [8, 12], sets: 3, rest: 120 },
  { id: "elevacao-lateral", name: "Elevação lateral", primary: "ombros", secondary: ["trapezio"], equipment: "halteres", movement: "isolado", reps: [12, 20], sets: 3, rest: 60, technique: "Suba até a linha dos ombros com leve inclinação à frente. Evite encolher os ombros." },
  { id: "elevacao-lateral-polia", name: "Elevação lateral na polia", primary: "ombros", secondary: ["trapezio"], equipment: "polia", movement: "isolado", reps: [12, 20], sets: 3, rest: 60, technique: "A polia mantém tensão constante na porção inferior; controle a descida." },
  { id: "elevacao-frontal", name: "Elevação frontal", primary: "ombros", secondary: [], equipment: "halteres", movement: "isolado", reps: [12, 15], sets: 2, rest: 60 },
  { id: "crucifixo-inverso-maquina", name: "Crucifixo inverso na máquina", primary: "ombros", secondary: ["costas", "trapezio"], equipment: "maquina", movement: "isolado", reps: [12, 20], sets: 3, rest: 60, technique: "Foco no deltoide posterior: cotovelos levemente flexionados, abra os braços até a linha do tronco." },
  { id: "face-pull", name: "Face pull na polia", primary: "ombros", secondary: ["costas", "trapezio"], equipment: "polia", movement: "puxar-horizontal", reps: [12, 20], sets: 3, rest: 60 },

  // ───── Costas ─────
  { id: "puxada-alta-frente", name: "Puxada alta na frente", primary: "costas", secondary: ["biceps", "antebracos"], equipment: "polia", movement: "puxar-vertical", reps: [8, 12], sets: 3, rest: 120, technique: "Puxe com os cotovelos em direção ao quadril, peito aberto; evite balançar o tronco." },
  { id: "puxada-neutra", name: "Puxada neutra", primary: "costas", secondary: ["biceps", "antebracos"], equipment: "polia", movement: "puxar-vertical", reps: [10, 12], sets: 2, rest: 120 },
  { id: "barra-fixa", name: "Barra fixa", primary: "costas", secondary: ["biceps", "antebracos"], equipment: "peso-corporal", movement: "puxar-vertical", reps: [5, 12], sets: 3, rest: 150 },
  { id: "remada-apoio-peito", name: "Remada com apoio no peito", primary: "costas", secondary: ["biceps", "ombros"], equipment: "maquina", movement: "puxar-horizontal", reps: [8, 12], sets: 3, rest: 120, technique: "Peito firme no apoio; puxe os cotovelos para trás e junte as escápulas no final." },
  { id: "remada-unilateral-polia", name: "Remada unilateral na polia", primary: "costas", secondary: ["biceps"], equipment: "polia", movement: "puxar-horizontal", unilateral: true, reps: [10, 15], sets: 2, rest: 90, technique: "Permita leve rotação do tronco no alongamento e trave o core na fase de puxada." },
  { id: "remada-baixa-polia", name: "Remada baixa na polia", primary: "costas", secondary: ["biceps", "ombros"], equipment: "polia", movement: "puxar-horizontal", reps: [8, 12], sets: 3, rest: 120 },
  { id: "remada-curvada-barra", name: "Remada curvada com barra", primary: "costas", secondary: ["biceps", "lombar", "posteriores"], equipment: "barra", movement: "puxar-horizontal", reps: [6, 10], sets: 3, rest: 150 },
  { id: "remada-cavalinho", name: "Remada cavalinho (T-bar)", primary: "costas", secondary: ["biceps", "lombar"], equipment: "maquina", movement: "puxar-horizontal", reps: [8, 12], sets: 3, rest: 120 },
  { id: "pulldown-bracos-estendidos", name: "Pulldown com braços estendidos", primary: "costas", secondary: ["triceps", "ombros"], equipment: "polia", movement: "isolado", reps: [12, 15], sets: 2, rest: 90, technique: "Braços quase estendidos, leve o cabo até a coxa sem dobrar os cotovelos. Isola o grande dorsal." },
  { id: "encolhimento-halteres", name: "Encolhimento com halteres", primary: "trapezio", secondary: [], equipment: "halteres", movement: "isolado", reps: [10, 15], sets: 3, rest: 60 },

  // ───── Bíceps ─────
  { id: "rosca-direta-ez", name: "Rosca direta com barra EZ", primary: "biceps", secondary: ["antebracos"], equipment: "barra", movement: "isolado", reps: [8, 12], sets: 3, rest: 90, technique: "Cotovelos fixos ao lado do corpo; não balance o tronco para ajudar." },
  { id: "rosca-inclinada-halteres", name: "Rosca inclinada com halteres", primary: "biceps", secondary: ["antebracos"], equipment: "halteres", movement: "isolado", reps: [10, 15], sets: 2, rest: 90, technique: "Banco a 45–60° para alongar a cabeça longa; desça completamente." },
  { id: "rosca-scott", name: "Rosca Scott", primary: "biceps", secondary: ["antebracos"], equipment: "maquina", movement: "isolado", reps: [10, 15], sets: 2, rest: 90 },
  { id: "rosca-martelo", name: "Rosca martelo", primary: "biceps", secondary: ["antebracos"], equipment: "halteres", movement: "isolado", reps: [10, 15], sets: 3, rest: 60 },

  // ───── Tríceps ─────
  { id: "triceps-corda-polia", name: "Tríceps na polia com corda", primary: "triceps", secondary: [], equipment: "polia", movement: "isolado", reps: [10, 15], sets: 3, rest: 60, technique: "Cotovelos colados ao tronco; abra a corda no final da extensão." },
  { id: "triceps-acima-cabeca-polia", name: "Tríceps acima da cabeça na polia", primary: "triceps", secondary: [], equipment: "polia", movement: "isolado", reps: [10, 15], sets: 2, rest: 60, technique: "Posição alongada para a cabeça longa; mantenha os cotovelos apontados para a frente." },
  { id: "triceps-testa", name: "Tríceps testa", primary: "triceps", secondary: [], equipment: "barra", movement: "isolado", reps: [8, 12], sets: 3, rest: 90 },
  { id: "triceps-frances-halter", name: "Tríceps francês com halter", primary: "triceps", secondary: [], equipment: "halteres", movement: "isolado", reps: [10, 15], sets: 3, rest: 60 },

  // ───── Quadríceps / pernas ─────
  { id: "agachamento-livre", name: "Agachamento livre", primary: "quadriceps", secondary: ["gluteos", "lombar", "abdomen"], equipment: "barra", movement: "dominante-joelho", reps: [6, 10], sets: 3, rest: 180, technique: "Pés na largura dos ombros, joelhos acompanham a direção dos pés. Desça até onde conseguir manter a coluna neutra." },
  { id: "hack-squat", name: "Hack squat", primary: "quadriceps", secondary: ["gluteos"], equipment: "maquina", movement: "dominante-joelho", reps: [6, 10], sets: 3, rest: 180, technique: "Alternativa ao agachamento livre com menor demanda de estabilização." },
  { id: "leg-press", name: "Leg press", primary: "quadriceps", secondary: ["gluteos"], equipment: "maquina", movement: "dominante-joelho", reps: [10, 15], sets: 3, rest: 120, technique: "Não deixe o quadril descolar do assento no fundo do movimento." },
  { id: "cadeira-extensora", name: "Cadeira extensora", primary: "quadriceps", secondary: [], equipment: "maquina", movement: "isolado", reps: [12, 15], sets: 2, rest: 90, technique: "Alinhe o eixo da máquina com o joelho; segure 1s no topo." },
  { id: "afundo", name: "Afundo com halteres", primary: "quadriceps", secondary: ["gluteos", "posteriores"], equipment: "halteres", movement: "dominante-joelho", unilateral: true, reps: [8, 12], sets: 3, rest: 120 },
  { id: "agachamento-bulgaro", name: "Agachamento búlgaro", primary: "quadriceps", secondary: ["gluteos", "posteriores"], equipment: "halteres", movement: "dominante-joelho", unilateral: true, reps: [8, 12], sets: 3, rest: 120 },

  // ───── Posteriores / glúteos ─────
  { id: "mesa-flexora", name: "Mesa flexora", primary: "posteriores", secondary: ["panturrilhas"], equipment: "maquina", movement: "isolado", reps: [10, 15], sets: 3, rest: 90, technique: "Evite levantar o quadril do banco; controle a fase excêntrica." },
  { id: "cadeira-flexora", name: "Cadeira flexora", primary: "posteriores", secondary: [], equipment: "maquina", movement: "isolado", reps: [10, 15], sets: 3, rest: 90 },
  { id: "levantamento-terra-romeno", name: "Levantamento terra romeno", primary: "posteriores", secondary: ["gluteos", "lombar", "antebracos"], equipment: "barra", movement: "dominante-quadril", reps: [6, 10], sets: 3, rest: 180, technique: "Quadril para trás, barra rente às coxas, coluna neutra. Desça até sentir alongamento nos posteriores." },
  { id: "stiff-halteres", name: "Stiff com halteres", primary: "posteriores", secondary: ["gluteos", "lombar"], equipment: "halteres", movement: "dominante-quadril", reps: [8, 12], sets: 3, rest: 120 },
  { id: "hip-thrust", name: "Hip thrust", primary: "gluteos", secondary: ["posteriores"], equipment: "barra", movement: "dominante-quadril", reps: [8, 12], sets: 2, rest: 120, technique: "Queixo baixo, costelas fechadas; no topo o joelho forma 90° e o quadril fica totalmente estendido." },
  { id: "extensao-quadril-polia", name: "Extensão de quadril na polia", primary: "gluteos", secondary: ["posteriores"], equipment: "polia", movement: "dominante-quadril", unilateral: true, reps: [10, 15], sets: 2, rest: 90, technique: "Alternativa ao hip thrust. Chute para trás sem hiperestender a lombar." },
  { id: "elevacao-pelvica-maquina", name: "Elevação pélvica na máquina", primary: "gluteos", secondary: ["posteriores"], equipment: "maquina", movement: "dominante-quadril", reps: [8, 12], sets: 2, rest: 120 },

  // ───── Panturrilhas ─────
  { id: "panturrilha-em-pe", name: "Panturrilha em pé", primary: "panturrilhas", secondary: [], equipment: "maquina", movement: "isolado", reps: [10, 15], sets: 3, rest: 60, technique: "Amplitude completa; pausa de 1–2s no alongamento máximo." },
  { id: "panturrilha-sentada", name: "Panturrilha sentada", primary: "panturrilhas", secondary: [], equipment: "maquina", movement: "isolado", reps: [12, 20], sets: 3, rest: 60, technique: "Enfatiza o sóleo; use cadência lenta." },
  { id: "panturrilha-leg-press", name: "Panturrilha no leg press", primary: "panturrilhas", secondary: [], equipment: "maquina", movement: "isolado", reps: [12, 20], sets: 3, rest: 60 },

  // ───── Core ─────
  { id: "abdominal-polia", name: "Abdominal na polia", primary: "abdomen", secondary: [], equipment: "polia", movement: "core", reps: [10, 15], sets: 3, rest: 60, technique: "Flexione a coluna enrolando o tronco; o quadril fica fixo." },
  { id: "prancha", name: "Prancha abdominal", primary: "abdomen", secondary: ["lombar", "ombros"], equipment: "peso-corporal", movement: "core", measure: "time", reps: [30, 60], sets: 3, rest: 60, technique: "Corpo alinhado da cabeça aos calcanhares, glúteos contraídos. Registre os segundos no campo de repetições." },
  { id: "elevacao-pernas", name: "Elevação de pernas", primary: "abdomen", secondary: [], equipment: "peso-corporal", movement: "core", reps: [10, 15], sets: 3, rest: 60 },
  { id: "abdominal-supra", name: "Abdominal supra", primary: "abdomen", secondary: [], equipment: "peso-corporal", movement: "core", reps: [12, 20], sets: 3, rest: 45 },
];

/** Exemplo visual (free-exercise-db) associado a cada exercício padrão. Ver data/exercise-demos.ts. */
const DEFAULT_DEMOS: Record<string, string> = {
  "supino-reto-barra": "Barbell_Bench_Press_-_Medium_Grip",
  "supino-inclinado-halteres": "Incline_Dumbbell_Press",
  "supino-inclinado-maquina": "Leverage_Incline_Chest_Press",
  "supino-reto-halteres": "Dumbbell_Bench_Press",
  "crucifixo-maquina": "Butterfly",
  "crossover-polia": "Cable_Crossover",
  "flexao-bracos": "Pushups",
  "mergulho-paralelas": "Dips_-_Chest_Version",
  "desenvolvimento-maquina": "Machine_Shoulder_Military_Press",
  "desenvolvimento-halteres": "Dumbbell_Shoulder_Press",
  "elevacao-lateral": "Side_Lateral_Raise",
  "elevacao-lateral-polia": "Cable_Seated_Lateral_Raise",
  "elevacao-frontal": "Front_Dumbbell_Raise",
  "crucifixo-inverso-maquina": "Reverse_Machine_Flyes",
  "face-pull": "Face_Pull",
  "puxada-alta-frente": "Wide-Grip_Lat_Pulldown",
  "puxada-neutra": "V-Bar_Pulldown",
  "barra-fixa": "Pullups",
  "remada-apoio-peito": "Leverage_Iso_Row",
  "remada-unilateral-polia": "Seated_One-arm_Cable_Pulley_Rows",
  "remada-baixa-polia": "Seated_Cable_Rows",
  "remada-curvada-barra": "Bent_Over_Barbell_Row",
  "remada-cavalinho": "T-Bar_Row_with_Handle",
  "pulldown-bracos-estendidos": "Straight-Arm_Pulldown",
  "encolhimento-halteres": "Dumbbell_Shrug",
  "rosca-direta-ez": "EZ-Bar_Curl",
  "rosca-inclinada-halteres": "Incline_Dumbbell_Curl",
  "rosca-scott": "Machine_Preacher_Curls",
  "rosca-martelo": "Hammer_Curls",
  "triceps-corda-polia": "Triceps_Pushdown_-_Rope_Attachment",
  "triceps-acima-cabeca-polia": "Triceps_Overhead_Extension_with_Rope",
  "triceps-testa": "EZ-Bar_Skullcrusher",
  "triceps-frances-halter": "Standing_Dumbbell_Triceps_Extension",
  "agachamento-livre": "Barbell_Squat",
  "hack-squat": "Hack_Squat",
  "leg-press": "Leg_Press",
  "cadeira-extensora": "Leg_Extensions",
  afundo: "Dumbbell_Lunges",
  "agachamento-bulgaro": "Split_Squat_with_Dumbbells",
  "mesa-flexora": "Lying_Leg_Curls",
  "cadeira-flexora": "Seated_Leg_Curl",
  "levantamento-terra-romeno": "Romanian_Deadlift",
  "stiff-halteres": "Stiff-Legged_Dumbbell_Deadlift",
  "hip-thrust": "Barbell_Hip_Thrust",
  "extensao-quadril-polia": "One-Legged_Cable_Kickback",
  "elevacao-pelvica-maquina": "Barbell_Glute_Bridge",
  "panturrilha-em-pe": "Standing_Calf_Raises",
  "panturrilha-sentada": "Seated_Calf_Raise",
  "panturrilha-leg-press": "Calf_Press_On_The_Leg_Press_Machine",
  "abdominal-polia": "Cable_Crunch",
  prancha: "Plank",
  "elevacao-pernas": "Flat_Bench_Lying_Leg_Raise",
  "abdominal-supra": "Crunches",
};

export const DEFAULT_EXERCISES: Exercise[] = seeds.map((s) => ({
  demoId: DEFAULT_DEMOS[s.id],
  id: s.id,
  name: s.name,
  primaryMuscle: s.primary,
  secondaryMuscles: s.secondary ?? [],
  equipment: s.equipment,
  movementType: s.movement,
  measure: s.measure ?? "reps",
  isUnilateral: s.unilateral ?? false,
  defaultRepMin: s.reps?.[0] ?? 8,
  defaultRepMax: s.reps?.[1] ?? 12,
  defaultSets: s.sets ?? 3,
  defaultRestSeconds: s.rest ?? 90,
  technique: s.technique,
  isCustom: false,
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
}));

export const DEFAULT_EXERCISE_IDS = new Set(DEFAULT_EXERCISES.map((e) => e.id));
