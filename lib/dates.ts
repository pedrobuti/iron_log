import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  getISODay,
  isSameDay,
  parseISO,
  startOfDay,
  startOfWeek,
  subDays,
  type Day,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Weekday } from "@/types";

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
  7: "Domingo",
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
  7: "Dom",
};

export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

export function nowIso(): string {
  return new Date().toISOString();
}

/** Dia da semana ISO (1 = segunda ... 7 = domingo). */
export function isoWeekday(date: Date = new Date()): Weekday {
  return getISODay(date) as Weekday;
}

/** Converte weekday ISO (1..7) para o índice do date-fns (0 = domingo). */
function toDateFnsDay(weekday: Weekday): Day {
  return (weekday % 7) as Day;
}

export function startOfTrainingWeek(date: Date, weekStartsOn: Weekday): Date {
  return startOfWeek(date, { weekStartsOn: toDateFnsDay(weekStartsOn) });
}

export function endOfTrainingWeek(date: Date, weekStartsOn: Weekday): Date {
  return endOfDay(addDays(startOfTrainingWeek(date, weekStartsOn), 6));
}

/** Ordena os dias da semana a partir do primeiro dia configurado. */
export function orderedWeekdays(weekStartsOn: Weekday): Weekday[] {
  const idx = WEEKDAYS.indexOf(weekStartsOn);
  return [...WEEKDAYS.slice(idx), ...WEEKDAYS.slice(0, idx)];
}

/** Data local no formato YYYY-MM-DD */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function fromDateKey(key: string): Date {
  return startOfDay(parseISO(key));
}

export function formatDateLong(date: Date): string {
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "HH:mm", { locale: ptBR });
}

export function formatDayMonth(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "d MMM", { locale: ptBR });
}

export function formatRelativeDays(iso: string, now: Date = new Date()): string {
  const d = parseISO(iso);
  const days = differenceInCalendarDays(now, d);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

export function hoursSince(iso: string, now: Date = new Date()): number {
  return (now.getTime() - parseISO(iso).getTime()) / 3_600_000;
}

export function isToday(iso: string, now: Date = new Date()): boolean {
  return isSameDay(parseISO(iso), now);
}

export function daysAgo(n: number, now: Date = new Date()): Date {
  return startOfDay(subDays(now, n));
}

/** Próxima ocorrência (incluindo hoje) de um weekday ISO. */
export function nextOccurrence(weekday: Weekday, from: Date = new Date()): Date {
  const today = isoWeekday(from);
  const diff = (weekday - today + 7) % 7;
  return startOfDay(addDays(from, diff));
}

/** Próxima ocorrência estritamente depois de hoje. */
export function nextOccurrenceAfterToday(weekday: Weekday, from: Date = new Date()): Date {
  const today = isoWeekday(from);
  const diff = ((weekday - today + 7) % 7) || 7;
  return startOfDay(addDays(from, diff));
}

export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Boa noite";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
