import { describe, expect, it } from "vitest";
import { CAPSULE_COLORS } from "@/components/art/Capsule";
import {
  addDays,
  atTime,
  describeDays,
  formatTime,
  isValidISODate,
  isValidTime,
  isoWeekday,
  parseISODate,
  startOfWeek,
  toISODate,
  weekDates,
} from "@/lib/pillbox/dates";
import { buildICS, escapeText, firstOccurrence, foldLine } from "@/lib/pillbox/ics";
import { adherence, dosesForDate, doseKey, isActiveOn, nextDose, slotOf, withDoseStatus } from "@/lib/pillbox/schedule";
import { parseStored, sanitizeState, serializeState, storageKey } from "@/lib/pillbox/storage";
import { COLOR_IDS, LIMITS, emptyState, type Medication, type PillboxState } from "@/lib/pillbox/types";

const diaria: Medication = {
  id: "med-a",
  name: "Medicamento A",
  note: "con comida",
  color: "verde",
  times: ["08:00", "20:00"],
  days: [1, 2, 3, 4, 5, 6, 7],
  startDate: "2026-11-01",
  endDate: null,
  createdAt: "2026-11-01T10:00:00.000Z",
};
const alternos: Medication = {
  id: "med-b",
  name: "Medicamento B",
  note: "",
  color: "azul",
  times: ["13:00"],
  days: [1, 3, 5],
  startDate: "2026-11-10",
  endDate: "2026-11-20",
  createdAt: "2026-11-10T10:00:00.000Z",
};
const state: PillboxState = { version: 1, medications: [diaria, alternos], log: {} };

describe("fechas", () => {
  it("convierte fechas locales de ida y vuelta", () => {
    expect(toISODate(new Date(2026, 10, 12))).toBe("2026-11-12");
    expect(toISODate(parseISODate("2026-11-12")!)).toBe("2026-11-12");
  });

  it.each(["2026-02-31", "2026-13-01", "2026-11-1", "abc", "", "2026-00-10", "2026-11-12T10:00"])("rechaza la fecha inválida %j", (value) => {
    expect(parseISODate(value)).toBeNull();
    expect(isValidISODate(value)).toBe(false);
  });

  it("valida horas HH:mm", () => {
    for (const ok of ["00:00", "08:05", "23:59"]) expect(isValidTime(ok)).toBe(true);
    for (const bad of ["24:00", "8:00", "08:60", "08-00", "", 800, null]) expect(isValidTime(bad)).toBe(false);
  });

  it("suma días cruzando mes y año, y calcula el día de la semana ISO", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(isoWeekday("2026-11-12")).toBe(4); // jueves
    expect(isoWeekday("2026-11-15")).toBe(7); // domingo
    expect(isoWeekday("2026-11-16")).toBe(1); // lunes
  });

  it("la semana empieza el lunes", () => {
    expect(startOfWeek("2026-11-12")).toBe("2026-11-09");
    expect(startOfWeek("2026-11-09")).toBe("2026-11-09");
    expect(startOfWeek("2026-11-15")).toBe("2026-11-09");
    const week = weekDates("2026-11-09");
    expect(week).toHaveLength(7);
    expect(week[6]).toBe("2026-11-15");
  });

  it("da formato de 12 horas en español", () => {
    expect(formatTime("08:00")).toBe("8:00 a. m.");
    expect(formatTime("00:30")).toBe("12:30 a. m.");
    expect(formatTime("12:00")).toBe("12:00 p. m.");
    expect(formatTime("18:45")).toBe("6:45 p. m.");
  });

  it("describe los días elegidos", () => {
    expect(describeDays([1, 2, 3, 4, 5, 6, 7])).toBe("Todos los días");
    expect(describeDays([1, 2, 3, 4, 5])).toBe("Lunes a viernes");
    expect(describeDays([7, 6])).toBe("Fines de semana");
    expect(describeDays([1, 3, 5])).toBe("Lun, Mié y Vie");
    expect(describeDays([2])).toBe("Martes");
  });

  it("atTime arma el momento exacto de una toma", () => {
    const moment = atTime("2026-11-12", "20:30");
    expect([moment.getFullYear(), moment.getMonth(), moment.getDate(), moment.getHours(), moment.getMinutes()]).toEqual([2026, 10, 12, 20, 30]);
  });
});

describe("programación de tomas", () => {
  it("los ids de color coinciden con los de las ilustraciones", () => {
    expect([...COLOR_IDS]).toEqual(CAPSULE_COLORS.map((c) => c.id));
  });

  it("agrupa las horas en mañana, tarde y noche", () => {
    expect(slotOf("00:00")).toBe("manana");
    expect(slotOf("11:59")).toBe("manana");
    expect(slotOf("12:00")).toBe("tarde");
    expect(slotOf("17:59")).toBe("tarde");
    expect(slotOf("18:00")).toBe("noche");
  });

  it("respeta días, fecha de inicio y fecha de fin", () => {
    expect(isActiveOn(alternos, "2026-11-12")).toBe(false); // jueves
    expect(isActiveOn(alternos, "2026-11-13")).toBe(true); // viernes
    expect(isActiveOn(alternos, "2026-11-09")).toBe(false); // lunes, pero antes de empezar
    expect(isActiveOn(alternos, "2026-11-20")).toBe(true); // viernes, último día
    expect(isActiveOn(alternos, "2026-11-23")).toBe(false); // lunes, ya terminó
    expect(isActiveOn(diaria, "2026-10-31")).toBe(false);
  });

  it("lista las tomas del día ordenadas por hora", () => {
    expect(dosesForDate(state, "2026-11-12").map((d) => `${d.time} ${d.name}`)).toEqual(["08:00 Medicamento A", "20:00 Medicamento A"]);
    expect(dosesForDate(state, "2026-11-13").map((d) => `${d.time} ${d.name}`)).toEqual([
      "08:00 Medicamento A",
      "13:00 Medicamento B",
      "20:00 Medicamento A",
    ]);
    expect(dosesForDate(emptyState(), "2026-11-12")).toEqual([]);
  });

  it("refleja el estado guardado en el registro", () => {
    const key = doseKey("med-a", "2026-11-12", "08:00");
    const marked = withDoseStatus(state, key, "taken");
    expect(dosesForDate(marked, "2026-11-12")[0].status).toBe("taken");
    expect(dosesForDate(marked, "2026-11-12")[1].status).toBe("pending");
    expect(state.log).toEqual({}); // no modifica el estado original
    expect(withDoseStatus(marked, key, null).log).toEqual({});
  });

  it("calcula la adherencia solo con las tomas que ya correspondían", () => {
    const now = new Date(2026, 10, 12, 14, 0);
    expect(adherence(state, "2026-11-12", "2026-11-12", now)).toEqual({ taken: 0, due: 1, percent: 0 });
    const tomada = withDoseStatus(state, doseKey("med-a", "2026-11-12", "08:00"), "taken");
    expect(adherence(tomada, "2026-11-12", "2026-11-12", now)).toEqual({ taken: 1, due: 1, percent: 100 });
    // Una toma marcada por adelantado también cuenta
    const adelantada = withDoseStatus(tomada, doseKey("med-a", "2026-11-12", "20:00"), "taken");
    expect(adherence(adelantada, "2026-11-12", "2026-11-12", now)).toEqual({ taken: 2, due: 2, percent: 100 });
    // Omitida cuenta como no tomada
    const omitida = withDoseStatus(state, doseKey("med-a", "2026-11-12", "08:00"), "skipped");
    expect(adherence(omitida, "2026-11-12", "2026-11-12", now)).toEqual({ taken: 0, due: 1, percent: 0 });
  });

  it("no inventa un porcentaje cuando no hay tomas que evaluar", () => {
    const early = new Date(2026, 10, 12, 6, 0);
    expect(adherence(state, "2026-11-12", "2026-11-12", early).percent).toBeNull();
    expect(adherence(emptyState(), "2026-11-09", "2026-11-15", early)).toEqual({ taken: 0, due: 0, percent: null });
  });

  it("calcula una semana completa", () => {
    const now = new Date(2026, 10, 16, 0, 0); // lunes siguiente
    const result = adherence(state, "2026-11-09", "2026-11-15", now);
    // A: 7 días × 2 tomas; B: lunes 9 no (antes del inicio), miércoles 11 y viernes 13
    expect(result).toEqual({ taken: 0, due: 14 + 2, percent: 0 });
  });

  it("elige la siguiente toma pendiente de hoy", () => {
    expect(nextDose(state, new Date(2026, 10, 12, 14, 0))?.time).toBe("20:00");
    expect(nextDose(state, new Date(2026, 10, 12, 7, 0))?.time).toBe("08:00");
    // Si ya pasaron todas, devuelve la primera atrasada
    expect(nextDose(state, new Date(2026, 10, 12, 23, 0))?.time).toBe("08:00");
    const todas = withDoseStatus(withDoseStatus(state, doseKey("med-a", "2026-11-12", "08:00"), "taken"), doseKey("med-a", "2026-11-12", "20:00"), "skipped");
    expect(nextDose(todas, new Date(2026, 10, 12, 9, 0))).toBeNull();
  });
});

describe("almacenamiento", () => {
  it("usa una clave distinta por persona", () => {
    expect(storageKey("u1")).not.toBe(storageKey("u2"));
    expect(storageKey("u1")).toContain("pillbox");
  });

  it("devuelve un estado vacío ante datos ilegibles", () => {
    for (const raw of [null, "", "no es json", "[]", "123", "null", '{"medications":"x"}']) {
      expect(parseStored(raw)).toEqual(emptyState());
    }
    expect(sanitizeState(undefined)).toEqual(emptyState());
    expect(sanitizeState("texto")).toEqual(emptyState());
  });

  it("conserva un estado válido tras guardar y leer", () => {
    const withLog = withDoseStatus(state, doseKey("med-a", "2026-11-12", "08:00"), "taken");
    expect(parseStored(serializeState(withLog))).toEqual(withLog);
  });

  it("limpia y corrige las medicinas dañadas o manipuladas", () => {
    const dirty = {
      version: 1,
      medications: [
        { ...diaria, name: "  Nombre\n\ncon   espacios  ", note: "x".repeat(500), color: "rojo-inventado", times: ["20:00", "08:00", "08:00", "99:99", 5] },
        { ...alternos, id: "med-c", endDate: "2026-11-01" }, // fin anterior al inicio → se quita el fin
        { ...diaria, id: "sin-horas", times: [] },
        { ...diaria, id: "sin-dias", days: [0, 8, 1.5] },
        { ...diaria, id: "fecha-mala", startDate: "2026-02-31" },
        { ...diaria, id: "sin nombre", name: "   " },
        { ...diaria, id: "med-a" }, // id repetido
        "no soy un objeto",
        null,
      ],
      log: {
        "med-a|2026-11-12|08:00": "taken",
        "med-a|2026-11-12|09:00": "dormido", // estado inválido
        "otro|2026-11-12|08:00": "taken", // medicamento que no existe
        "med-a|2026-13-12|08:00": "taken", // fecha mal formada pero con el formato correcto: se conserva solo si coincide el patrón
        "__proto__|2026-11-12|08:00": "taken",
      },
    };
    const clean = sanitizeState(dirty);
    expect(clean.medications.map((m) => m.id)).toEqual(["med-a", "med-c"]);
    const [a, c] = clean.medications;
    expect(a.name).toBe("Nombre con espacios");
    expect(a.note).toHaveLength(LIMITS.note);
    expect(a.color).toBe("verde");
    expect(a.times).toEqual(["08:00", "20:00"]);
    expect(c.endDate).toBeNull();
    expect(Object.keys(clean.log)).not.toContain("otro|2026-11-12|08:00");
    expect(Object.keys(clean.log)).not.toContain("__proto__|2026-11-12|08:00");
    expect(clean.log["med-a|2026-11-12|08:00"]).toBe("taken");
    expect(clean.log["med-a|2026-11-12|09:00"]).toBeUndefined();
    expect(Object.getPrototypeOf(clean.log)).toBe(Object.prototype);
  });

  it("limita la cantidad de medicamentos y de horarios", () => {
    const many = Array.from({ length: LIMITS.medications + 10 }, (_, i) => ({ ...diaria, id: `m${i}`, times: ["01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00"] }));
    const clean = sanitizeState({ medications: many, log: {} });
    expect(clean.medications).toHaveLength(LIMITS.medications);
    expect(clean.medications[0].times).toHaveLength(LIMITS.timesPerMedication);
  });
});

describe("exportación a calendario (.ics)", () => {
  const now = new Date(Date.UTC(2026, 10, 12, 15, 30, 5));

  it("genera un calendario válido con saltos de línea CRLF", () => {
    const ics = buildICS([diaria, alternos], now);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/); // ningún salto de línea suelto
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3); // A × 2 horas + B × 1 hora
    expect(ics.match(/END:VEVENT/g)).toHaveLength(3);
    expect(ics).toContain("DTSTAMP:20261112T153005Z");
  });

  it("cada hora es un evento semanal con sus días y su fin", () => {
    const ics = buildICS([alternos], now);
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261120T235959");
    expect(ics).toContain("DTSTART:20261111T130000"); // 10 nov es martes → primer miércoles
    expect(ics).toContain("DTEND:20261111T131500");
    expect(ics).toContain("SUMMARY:Tomar Medicamento B");
    expect(ics).toContain("BEGIN:VALARM");
  });

  it("alinea el primer evento con el primer día elegido", () => {
    expect(firstOccurrence({ ...diaria, days: [1, 3, 5], startDate: "2026-11-12" })).toBe("2026-11-13");
    expect(firstOccurrence({ ...diaria, days: [4], startDate: "2026-11-12" })).toBe("2026-11-12");
    expect(firstOccurrence({ ...diaria, days: [1], startDate: "2026-11-12", endDate: "2026-11-14" })).toBeNull();
    expect(buildICS([{ ...diaria, days: [1], startDate: "2026-11-12", endDate: "2026-11-14" }], now)).not.toContain("BEGIN:VEVENT");
  });

  it("los UID son únicos por medicamento y hora", () => {
    const uids = buildICS([diaria, alternos], now).match(/^UID:.+$/gm)!;
    expect(new Set(uids).size).toBe(uids.length);
  });

  it("escapa comas, punto y coma, barras y saltos de línea", () => {
    expect(escapeText("a, b; c\\d\ne")).toBe("a\\, b\; c\\\\d\\ne");
    const ics = buildICS([{ ...diaria, name: "Vitamina, tabletas; ojo" }], now);
    expect(ics).toContain("SUMMARY:Tomar Vitamina\\, tabletas\; ojo");
  });

  it("pliega las líneas largas a 75 octetos sin partir caracteres", () => {
    const note = "Tomar después del desayuno con un vaso de agua y evitar el café ñandú áéíóú ".repeat(6).trim();
    const ics = buildICS([{ ...diaria, note }], now);
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain(`DESCRIPTION:${escapeText(note)} · Recordatorio`);
    expect(foldLine("a".repeat(200)).split("\r\n ").every((part) => part.length <= 75)).toBe(true);
  });

  it("sin medicamentos genera un calendario vacío", () => {
    const ics = buildICS([], now);
    expect(ics).not.toContain("VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });
});
