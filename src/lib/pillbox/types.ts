// Modelo del «pastillero». Todo vive en el navegador de la persona (localStorage): no hay tablas ni API.
// A propósito NO existe ningún campo de cantidad o dosis: la aplicación registra qué medicamento y a qué hora
// lo indicó el médico, pero nunca sugiere ni calcula cantidades.

export type ISODate = string; // «2026-11-12»
export type TimeOfDay = string; // «08:00»

/** Ids de color de cápsula (deben coincidir con CAPSULE_COLORS en components/art/Capsule.tsx; lo comprueba una prueba). */
export const COLOR_IDS = ["verde", "azul", "coral", "ambar", "violeta", "bosque"] as const;
export type ColorId = (typeof COLOR_IDS)[number];

export const LIMITS = {
  medications: 30,
  timesPerMedication: 6,
  name: 60,
  note: 120,
  logEntries: 6000,
} as const;

export interface Medication {
  id: string;
  name: string;
  /** Texto libre de la persona (por ejemplo «con comida» o «según fórmula médica»). */
  note: string;
  color: ColorId;
  /** Horas de toma, ordenadas y sin repetir. */
  times: TimeOfDay[];
  /** Días de la semana ISO: 1 = lunes … 7 = domingo. */
  days: number[];
  startDate: ISODate;
  /** Inclusive; null si no tiene fecha de fin. */
  endDate: ISODate | null;
  createdAt: string;
}

export type LogStatus = "taken" | "skipped";

export interface PillboxState {
  version: 1;
  medications: Medication[];
  /** Clave `${medicationId}|${fecha}|${hora}` → estado de esa toma. Lo que no está aquí está pendiente. */
  log: Record<string, LogStatus>;
}

export function emptyState(): PillboxState {
  return { version: 1, medications: [], log: {} };
}
