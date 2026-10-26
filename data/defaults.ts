import type { Settings } from "@/types";

export const DEFAULT_SETTINGS: Settings = {
  displayName: "",
  goal: "hipertrofia",
  experienceLevel: "intermediario",
  trainingDays: [1, 2, 3, 5, 6],
  plannedDurationMin: 60,
  defaultRir: 2,
  defaultRestSeconds: 90,
  unit: "kg",
  theme: "dark",
  weekStartsOn: 1,
  incrementUpperKg: 2.5,
  incrementLowerKg: 5,
  restTimerSound: true,
};

export const APP_DATA_VERSION = 1;
