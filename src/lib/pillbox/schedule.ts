import { atTime, addDays, isoWeekday, parseISODate, toISODate } from "./dates";
import type { ColorId, ISODate, LogStatus, Medication, PillboxState } from "./types";

export type DoseStatus = LogStatus | "pending";

export interface Dose {
  key: string;
  medicationId: string;
  name: string;
  note: string;
  color: ColorId;
  date: ISODate;
  time: string;
  status: DoseStatus;
}

export type Slot = "manana" | "tarde" | "noche";
export const SLOT_LABEL: Record<Slot, string> = { manana: "Mañana", tarde: "Tarde", noche: "Noche" };
export const SLOTS: Slot[] = ["manana", "tarde", "noche"];

export function doseKey(medicationId: string, date: ISODate, time: string): string {
  return `${medicationId}|${date}|${time}`;
}

/** Mañana: antes de las 12:00 · Tarde: de 12:00 a 17:59 · Noche: desde las 18:00. */
export function slotOf(time: string): Slot {
  const hour = Number(time.slice(0, 2));
  return hour < 12 ? "manana" : hour < 18 ? "tarde" : "noche";
}

/** ¿El medicamento tiene tomas programadas ese día? */
export function isActiveOn(medication: Medication, date: ISODate): boolean {
  if (date < medication.startDate) return false;
  if (medication.endDate && date > medication.endDate) return false;
  return medication.days.includes(isoWeekday(date));
}

export function dosesForDate(state: PillboxState, date: ISODate): Dose[] {
  const doses: Dose[] = [];
  for (const medication of state.medications) {
    if (!isActiveOn(medication, date)) continue;
    for (const time of medication.times) {
      const key = doseKey(medication.id, date, time);
      doses.push({
        key,
        medicationId: medication.id,
        name: medication.name,
        note: medication.note,
        color: medication.color,
        date,
        time,
        status: state.log[key] ?? "pending",
      });
    }
  }
  return doses.sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name, "es"));
}

/** Una toma «ya correspondía» si su hora pasó o si la persona ya la marcó. */
export function isDue(dose: Dose, now: Date): boolean {
  return dose.status !== "pending" || atTime(dose.date, dose.time).getTime() <= now.getTime();
}

export interface Adherence {
  taken: number;
  due: number;
  /** Entero de 0 a 100, o null si todavía no hay tomas que evaluar. */
  percent: number | null;
}

export function adherence(state: PillboxState, from: ISODate, to: ISODate, now: Date): Adherence {
  let taken = 0;
  let due = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    for (const dose of dosesForDate(state, day)) {
      if (!isDue(dose, now)) continue;
      due += 1;
      if (dose.status === "taken") taken += 1;
    }
  }
  return { taken, due, percent: due === 0 ? null : Math.round((taken / due) * 100) };
}

/** Primera toma pendiente de hoy que todavía no pasó (o, si no hay, la primera pendiente atrasada). */
export function nextDose(state: PillboxState, now: Date): Dose | null {
  const pending = dosesForDate(state, toISODate(now)).filter((dose) => dose.status === "pending");
  return pending.find((dose) => atTime(dose.date, dose.time).getTime() >= now.getTime()) ?? pending[0] ?? null;
}

/** Devuelve un estado nuevo con la toma marcada (o sin marca si status es null). */
export function withDoseStatus(state: PillboxState, key: string, status: LogStatus | null): PillboxState {
  const log = { ...state.log };
  if (status === null) delete log[key];
  else log[key] = status;
  return { ...state, log };
}

/** Ordena los horarios y quita repetidos. */
export function normalizeTimes(times: string[]): string[] {
  return [...new Set(times)].sort();
}

export function isValidRange(startDate: ISODate, endDate: ISODate | null): boolean {
  if (!parseISODate(startDate)) return false;
  if (endDate === null) return true;
  return parseISODate(endDate) !== null && endDate >= startDate;
}
