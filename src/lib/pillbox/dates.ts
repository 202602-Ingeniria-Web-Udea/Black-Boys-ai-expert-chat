import type { ISODate } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
export const WEEKDAY_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

/** Fecha local (no UTC) en formato AAAA-MM-DD. */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Convierte AAAA-MM-DD en una fecha local a medianoche; null si no es una fecha real (p. ej. 2026-02-31). */
export function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function isValidISODate(value: unknown): value is ISODate {
  return typeof value === "string" && parseISODate(value) !== null;
}

export function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function addDays(value: ISODate, amount: number): ISODate {
  const date = parseISODate(value);
  if (!date) throw new Error(`Fecha inválida: ${value}`);
  date.setDate(date.getDate() + amount);
  return toISODate(date);
}

/** Día de la semana ISO: 1 = lunes … 7 = domingo. */
export function isoWeekday(value: ISODate): number {
  const date = parseISODate(value);
  if (!date) throw new Error(`Fecha inválida: ${value}`);
  return date.getDay() === 0 ? 7 : date.getDay();
}

/** Lunes de la semana que contiene la fecha. */
export function startOfWeek(value: ISODate): ISODate {
  return addDays(value, 1 - isoWeekday(value));
}

export function weekDates(weekStart: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/** Momento local exacto de una toma. */
export function atTime(date: ISODate, time: string): Date {
  const base = parseISODate(date);
  if (!base) throw new Error(`Fecha inválida: ${date}`);
  base.setHours(Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);
  return base;
}

const longDate = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" });
const shortDate = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });
const fullDate = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });

/** «jueves, 12 de noviembre» */
export function formatLongDate(value: ISODate): string {
  const date = parseISODate(value);
  return date ? longDate.format(date) : value;
}
export function formatShortDate(value: ISODate): string {
  const date = parseISODate(value);
  return date ? shortDate.format(date).replace(".", "") : value;
}
export function formatFullDate(value: ISODate): string {
  const date = parseISODate(value);
  return date ? fullDate.format(date).replace(/\./g, "") : value;
}

/** «8:00 a. m.» a partir de «08:00». */
export function formatTime(time: string): string {
  const hours = Number(time.slice(0, 2));
  const suffix = hours < 12 ? "a. m." : "p. m.";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${time.slice(3, 5)} ${suffix}`;
}

/** «Todos los días», «Lunes a viernes», «Lun, mié y vie»… */
export function describeDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return "Todos los días";
  if (sorted.length === 5 && sorted.every((d, i) => d === i + 1)) return "Lunes a viernes";
  if (sorted.length === 2 && sorted[0] === 6 && sorted[1] === 7) return "Fines de semana";
  const names = sorted.map((d) => WEEKDAY_SHORT[d - 1]);
  if (names.length === 1) return WEEKDAY_LONG[sorted[0] - 1];
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}
