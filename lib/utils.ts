import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function round(n: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function average(values: number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Formata segundos como mm:ss ou h:mm:ss */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Formata minutos para "1h 05min" ou "45 min" */
export function formatMinutes(totalMinutes: number): string {
  const m = Math.round(totalMinutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h ${String(rest).padStart(2, "0")}min`;
}

export function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

export function groupBy<T, K extends string | number>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export function sortBy<T>(items: T[], selector: (item: T) => number | string, dir: "asc" | "desc" = "asc"): T[] {
  const copy = [...items];
  copy.sort((a, b) => {
    const va = selector(a);
    const vb = selector(b);
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return copy;
}

export function parseNumberInput(value: string): number | null {
  if (value.trim() === "") return null;
  const normalized = value.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
