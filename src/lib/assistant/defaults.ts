// Valores por defecto del asistente.
//
// Salen de la plantilla de especialidad activa (variable ASSISTANT_PRESET, por defecto «salud»;
// ver src/lib/assistant/presets). Se usan al crear la fila inicial de la tabla assistant_settings y al
// pulsar «Restablecer valores por defecto». Después, el ADMIN puede editar todo desde el panel
// (Administración → Asistente) sin tocar el código.
//
// ¿Tu equipo eligió otra especialidad? Ver docs/PLANTILLAS_ESPECIALIDAD.md.

import { activePreset } from "./presets";

export function getDefaultAssistant() {
  const { assistant } = activePreset();
  return {
    name: assistant.name,
    specialty: assistant.specialty,
    systemPrompt: assistant.systemPrompt,
    welcomeMessage: assistant.welcomeMessage,
    suggestedQuestions: [...assistant.suggestedQuestions],
    model: null as string | null,
    temperature: assistant.temperature,
    maxTokens: assistant.maxTokens,
    contextMessages: assistant.contextMessages,
  };
}
