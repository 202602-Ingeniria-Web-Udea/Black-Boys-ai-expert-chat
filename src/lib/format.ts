// Formateo de fechas con zona horaria fija (Colombia) para que servidor y cliente coincidan.
const TZ = "America/Bogota";

const dateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });
const dateOnly = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: TZ });
const timeOnly = new Intl.DateTimeFormat("es-CO", { timeStyle: "short", timeZone: TZ });
const dayKey = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TZ });

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export const formatDateTime = (v: string | Date) => dateTime.format(toDate(v));
export const formatDate = (v: string | Date) => dateOnly.format(toDate(v));
export const formatTime = (v: string | Date) => timeOnly.format(toDate(v));

/** Agrupa fechas en etiquetas legibles para el historial: Hoy, Ayer, Últimos 7 días, Anteriores. */
export function dayBucket(value: string | Date, now = new Date()): "Hoy" | "Ayer" | "Últimos 7 días" | "Anteriores" {
  const d = toDate(value);
  const today = dayKey.format(now);
  const yesterday = dayKey.format(new Date(now.getTime() - 86_400_000));
  const key = dayKey.format(d);
  if (key === today) return "Hoy";
  if (key === yesterday) return "Ayer";
  if (now.getTime() - d.getTime() < 7 * 86_400_000) return "Últimos 7 días";
  return "Anteriores";
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}
