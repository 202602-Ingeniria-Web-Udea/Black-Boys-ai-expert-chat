import { addDays, atTime, isoWeekday, toISODate } from "./dates";
import type { ISODate, Medication } from "./types";

// Exporta el pastillero como archivo .ics (iCalendar, RFC 5545) para llevarlo a Google Calendar, Apple Calendar u Outlook.
// Cada hora de cada medicamento es un evento que se repite cada semana en los días elegidos. Las horas son «flotantes»
// (sin zona horaria): el calendario las interpreta en la zona de quien las importa, que es lo que se quiere en un recordatorio.

const DAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const MAX_OCTETS = 75;

export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Pliega una línea a un máximo de 75 octetos UTF-8 (las continuaciones empiezan con un espacio). */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const compactDate = (value: ISODate) => value.replace(/-/g, "");
const compactTime = (time: string) => `${time.slice(0, 2)}${time.slice(3, 5)}00`;

/** Primera fecha desde el inicio en la que cae un día elegido (y que no pasa de la fecha de fin). */
export function firstOccurrence(medication: Medication): ISODate | null {
  for (let offset = 0; offset < 7; offset++) {
    const day = addDays(medication.startDate, offset);
    if (medication.endDate && day > medication.endDate) return null;
    if (medication.days.includes(isoWeekday(day))) return day;
  }
  return null;
}

export function buildICS(medications: Medication[], now: Date = new Date()): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Botiquin//Pastillero//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Pastillero de Botiquín",
  ];

  for (const medication of medications) {
    const first = firstOccurrence(medication);
    if (!first) continue;
    const byDay = [...medication.days].sort((a, b) => a - b).map((d) => DAY_CODES[d - 1]).join(",");
    const until = medication.endDate ? `;UNTIL=${compactDate(medication.endDate)}T235959` : "";

    for (const time of medication.times) {
      const end = atTime(first, time);
      end.setMinutes(end.getMinutes() + 15);
      const description = [medication.note, "Recordatorio de tu pastillero de Botiquín. Sigue siempre lo que te indicó tu médico."]
        .filter(Boolean)
        .join(" · ");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${medication.id}-${time.replace(":", "")}@botiquin`,
        `DTSTAMP:${stamp(now)}`,
        `DTSTART:${compactDate(first)}T${compactTime(time)}`,
        `DTEND:${compactDate(toISODate(end))}T${String(end.getHours()).padStart(2, "0")}${String(end.getMinutes()).padStart(2, "0")}00`,
        `RRULE:FREQ=WEEKLY;BYDAY=${byDay}${until}`,
        `SUMMARY:${escapeText(`Tomar ${medication.name}`)}`,
        `DESCRIPTION:${escapeText(description)}`,
        "CATEGORIES:Salud",
        "TRANSP:TRANSPARENT",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "TRIGGER:PT0M",
        `DESCRIPTION:${escapeText(`Tomar ${medication.name}`)}`,
        "END:VALARM",
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

