import type { EvalQuestion } from "@/lib/evaluation/questions";

export const PRESET_IDS = ["salud", "programacion", "deporte", "mecanica", "gastronomia", "turismo"] as const;
export type PresetId = (typeof PRESET_IDS)[number];

/** Todo lo que el panel de administración permite editar del asistente (salvo el modelo, que depende del proveedor). */
export interface AssistantTemplate {
  name: string;
  specialty: string;
  systemPrompt: string;
  /** Texto simple (sin Markdown): se muestra tal cual en el chat vacío, el login y la landing. */
  welcomeMessage: string;
  suggestedQuestions: string[];
  temperature: number;
  maxTokens: number;
  contextMessages: number;
}

/**
 * Plantilla de especialidad: el asistente (identidad, System Prompt, bienvenida, preguntas sugeridas,
 * parámetros) más su batería de 14 preguntas de prueba (D1–D6 dominio, F1–F3 fuera de especialidad,
 * U1–U3 incertidumbre/limitaciones, S1–S2 seguridad).
 */
export interface SpecialtyPreset {
  id: PresetId;
  /** Nombre corto para menús. */
  label: string;
  /** Alcance, tal como lo describe el enunciado del proyecto. */
  scope: string;
  assistant: AssistantTemplate;
  questions: EvalQuestion[];
}
