import type { ChatTurn } from "./types";

export interface HistoryItem {
  role: "USER" | "ASSISTANT";
  content: string;
}

/**
 * Construye el contexto conversacional que se envía al modelo:
 *  1. toma los últimos `maxMessages` mensajes;
 *  2. si exceden el presupuesto de caracteres, descarta los más antiguos (nunca el último);
 *  3. garantiza que el contexto empiece con un mensaje del usuario;
 *  4. une los mensajes consecutivos del mismo rol (pasa cuando una pregunta falló y el usuario
 *     siguió escribiendo): algunos proveedores rechazan turnos repetidos del mismo rol.
 */
export function buildContext(history: HistoryItem[], opts: { maxMessages: number; maxChars?: number }): ChatTurn[] {
  const maxChars = opts.maxChars ?? 24_000;
  let slice = history.slice(-Math.max(1, opts.maxMessages));
  let total = slice.reduce((sum, m) => sum + m.content.length, 0);
  while (slice.length > 1 && total > maxChars) {
    total -= slice[0].content.length;
    slice = slice.slice(1);
  }
  while (slice.length > 1 && slice[0].role === "ASSISTANT") slice = slice.slice(1);

  const turns: ChatTurn[] = [];
  for (const m of slice) {
    const role = m.role === "USER" ? "user" : "assistant";
    const previous = turns[turns.length - 1];
    if (previous && previous.role === role) previous.content += `\n\n${m.content}`;
    else turns.push({ role, content: m.content });
  }
  return turns;
}
