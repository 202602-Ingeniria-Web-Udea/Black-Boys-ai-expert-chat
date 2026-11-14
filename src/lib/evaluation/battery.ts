import { activePreset, presetForSpecialty, type PresetId } from "@/lib/assistant/presets";
import type { EvalQuestion } from "./questions";

export interface EvaluationBattery {
  presetId: PresetId;
  presetLabel: string;
  /** true si la batería corresponde a la especialidad guardada; false si es la de la plantilla activa por no haber coincidencia. */
  matched: boolean;
  questions: EvalQuestion[];
}

/**
 * Elige la batería de 14 preguntas según la especialidad del asistente guardada en la base de datos.
 * Si el equipo escribió una especialidad sin plantilla (por ejemplo «Veterinaria»), se usa la batería de la
 * plantilla activa y `matched` es false: el panel avisa para que las preguntas se adapten a mano.
 */
export function batteryFor(specialty: string): EvaluationBattery {
  const matched = presetForSpecialty(specialty);
  const preset = matched ?? activePreset();
  return { presetId: preset.id, presetLabel: preset.label, matched: Boolean(matched), questions: preset.questions };
}
