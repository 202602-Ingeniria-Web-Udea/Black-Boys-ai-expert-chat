import { isValidISODate, isValidTime } from "./dates";
import { COLOR_IDS, LIMITS, emptyState, type ColorId, type LogStatus, type Medication, type PillboxState } from "./types";

export const STORAGE_PREFIX = "botiquin:pillbox:v1:";
export const storageKey = (userId: string) => `${STORAGE_PREFIX}${userId}`;

const LOG_KEY = /^[\w-]{1,64}\|\d{4}-\d{2}-\d{2}\|\d{2}:\d{2}$/;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function sanitizeMedication(raw: unknown): Medication | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" && /^[\w-]{1,64}$/.test(item.id) ? item.id : null;
  const name = text(item.name, LIMITS.name);
  if (!id || !name) return null;

  const times = Array.isArray(item.times)
    ? [...new Set(item.times.filter(isValidTime))].sort().slice(0, LIMITS.timesPerMedication)
    : [];
  const days = Array.isArray(item.days)
    ? [...new Set(item.days.filter((d): d is number => Number.isInteger(d) && d >= 1 && d <= 7))].sort((a, b) => a - b)
    : [];
  if (times.length === 0 || days.length === 0) return null;
  if (!isValidISODate(item.startDate)) return null;
  const endDate = isValidISODate(item.endDate) && item.endDate >= item.startDate ? item.endDate : null;

  return {
    id,
    name,
    note: text(item.note, LIMITS.note),
    color: (COLOR_IDS as readonly string[]).includes(item.color as string) ? (item.color as ColorId) : "verde",
    times,
    days,
    startDate: item.startDate,
    endDate,
    createdAt: typeof item.createdAt === "string" ? item.createdAt.slice(0, 40) : "",
  };
}

/**
 * Convierte lo que haya guardado (o importado desde un archivo) en un estado válido. Lo que no cumple el
 * formato se descarta en lugar de romper la pantalla: el almacenamiento del navegador puede estar dañado.
 */
export function sanitizeState(raw: unknown): PillboxState {
  if (!raw || typeof raw !== "object") return emptyState();
  const source = raw as Record<string, unknown>;

  const seen = new Set<string>();
  const medications: Medication[] = [];
  if (Array.isArray(source.medications)) {
    for (const entry of source.medications) {
      const medication = sanitizeMedication(entry);
      if (!medication || seen.has(medication.id)) continue;
      seen.add(medication.id);
      medications.push(medication);
      if (medications.length >= LIMITS.medications) break;
    }
  }

  const log: Record<string, LogStatus> = {};
  if (source.log && typeof source.log === "object" && !Array.isArray(source.log)) {
    let count = 0;
    for (const [key, value] of Object.entries(source.log as Record<string, unknown>)) {
      if (count >= LIMITS.logEntries) break;
      if (!LOG_KEY.test(key) || (value !== "taken" && value !== "skipped")) continue;
      const medicationId = key.split("|")[0];
      if (!seen.has(medicationId)) continue;
      log[key] = value;
      count += 1;
    }
  }
  return { version: 1, medications, log };
}

export function parseStored(raw: string | null): PillboxState {
  if (!raw) return emptyState();
  try {
    return sanitizeState(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function serializeState(state: PillboxState): string {
  return JSON.stringify(state);
}
