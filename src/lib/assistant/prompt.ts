import { urgencyPromptBlock, type UrgencySignal } from "@/lib/safety/urgency";

/**
 * Compone el System Prompt que se envía al modelo: el texto configurado por el administrador
 * más un bloque de contexto de ejecución (fecha actual en Colombia) y, si el último mensaje de la persona
 * contiene una señal de urgencia (sobredosis, intoxicación, emergencia o crisis), una alerta de seguridad
 * con reglas de prioridad para esa respuesta.
 */
export function composeSystemPrompt(settings: { systemPrompt: string }, now = new Date(), urgency: UrgencySignal | null = null): string {
  const date = new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeZone: "America/Bogota" }).format(now);
  const base = `${settings.systemPrompt.trim()}\n\n# CONTEXTO DE LA CONVERSACIÓN\nFecha actual: ${date}.`;
  return urgency ? `${base}\n\n${urgencyPromptBlock(urgency)}` : base;
}
