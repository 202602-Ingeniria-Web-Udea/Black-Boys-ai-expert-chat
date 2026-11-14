// Registro de plantillas de especialidad.
//
// El enunciado exige que cada equipo elija una especialidad DIFERENTE (sección 2 del PDF). Para que
// cambiarla no obligue a reescribir código, el proyecto trae seis plantillas completas: cada una define
// la identidad del asistente, su System Prompt, el mensaje de bienvenida, las preguntas sugeridas y su
// propia batería de 14 preguntas de prueba.
//
//   · La plantilla inicial (y la que usa «Restablecer valores por defecto») sale de la variable de
//     entorno ASSISTANT_PRESET (por defecto: salud).
//   · Desde Administración → Asistente se puede cargar cualquier plantilla y guardarla.
//   · Administración → Pruebas elige la batería comparando la especialidad guardada con las plantillas.

import { deporte } from "./deporte";
import { gastronomia } from "./gastronomia";
import { mecanica } from "./mecanica";
import { programacion } from "./programacion";
import { salud } from "./salud";
import { turismo } from "./turismo";
import { PRESET_IDS, type PresetId, type SpecialtyPreset } from "./types";

export { PRESET_IDS };
export type { AssistantTemplate, PresetId, SpecialtyPreset } from "./types";

export const DEFAULT_PRESET_ID: PresetId = "salud";

/** Orden en que se muestran en los menús (la plantilla de este equipo va primero). */
export const PRESETS: readonly SpecialtyPreset[] = [salud, programacion, deporte, mecanica, gastronomia, turismo];

const BY_ID = new Map<string, SpecialtyPreset>(PRESETS.map((p) => [p.id, p]));

export function isPresetId(value: string): value is PresetId {
  return BY_ID.has(value);
}

export function getPreset(id: string): SpecialtyPreset | undefined {
  return BY_ID.get(id);
}

/** Minúsculas, sin tildes y con espacios simples: «Mecánica  Automotriz» → «mecanica automotriz». */
export function normalizeSpecialty(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Plantilla activa: la indicada en ASSISTANT_PRESET. Si la variable falta o no coincide con ninguna
 * plantilla se usa «salud» (no se rompe el arranque por un error de configuración).
 */
export function activePreset(env: Record<string, string | undefined> = process.env): SpecialtyPreset {
  const wanted = normalizeSpecialty(env.ASSISTANT_PRESET ?? "");
  return (wanted && (BY_ID.get(wanted) ?? presetForSpecialty(wanted))) || BY_ID.get(DEFAULT_PRESET_ID)!;
}

/**
 * Busca la plantilla que corresponde a una especialidad escrita por una persona. Acepta el nombre de la
 * plantilla, su id y variantes que empiezan igual («Mecánica automotriz», «Programación web»).
 */
export function presetForSpecialty(specialty: string): SpecialtyPreset | undefined {
  const wanted = normalizeSpecialty(specialty);
  if (!wanted) return undefined;
  for (const preset of PRESETS) {
    const names = [preset.id, preset.label, preset.assistant.specialty].map(normalizeSpecialty);
    if (names.some((name) => wanted === name || wanted.startsWith(`${name} `) || wanted.startsWith(`${name}:`) || wanted.startsWith(`${name}-`))) {
      return preset;
    }
  }
  return undefined;
}

/** Versión serializable de las plantillas para el panel de administración (sin funciones). */
export function presetSummaries() {
  return PRESETS.map((p) => ({ id: p.id, label: p.label, scope: p.scope, assistant: { ...p.assistant, suggestedQuestions: [...p.assistant.suggestedQuestions] } }));
}
