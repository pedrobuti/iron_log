import type { WeightUnit } from "@/types";
import { round } from "./utils";

const KG_PER_LB = 0.45359237;

/** Converte kg (armazenamento) para a unidade de exibição. */
export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  return unit === "kg" ? round(kg, 2) : round(kg / KG_PER_LB, 2);
}

/** Converte valor digitado na unidade de exibição para kg. */
export function fromDisplayWeight(value: number, unit: WeightUnit): number {
  return unit === "kg" ? round(value, 3) : round(value * KG_PER_LB, 3);
}

export function formatWeight(kg: number | null | undefined, unit: WeightUnit, withUnit = true): string {
  if (kg === null || kg === undefined) return "—";
  const v = toDisplayWeight(kg, unit);
  const text = Number.isInteger(v) ? String(v) : v.toFixed(v * 10 === Math.round(v * 10) ? 1 : 2);
  return withUnit ? `${text} ${unit}` : text;
}

/** Arredonda um incremento ao múltiplo mais próximo compatível com a unidade. */
export function roundToIncrement(kg: number, stepKg: number): number {
  if (stepKg <= 0) return kg;
  return round(Math.round(kg / stepKg) * stepKg, 3);
}
