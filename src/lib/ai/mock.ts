import { AIError } from "./errors";
import { collect, sleep, type ChatProvider, type ChatTurn, type CompletionOptions } from "./types";

/**
 * Proveedor SIMULADO (Taller 2): no llama a ningún modelo real. Sirve para validar la interfaz,
 * el historial y la persistencia sin gastar cuota. La respuesta NO contiene información médica: solo
 * muestra la estructura que tendría una respuesta real (títulos, listas y avisos destacados).
 * Comandos de prueba (escríbelos como mensaje):
 *   /error      → simula una caída del proveedor (para ver el manejo de errores)
 *   /limite     → simula «demasiadas solicitudes» (429)
 *   /lento      → respuesta lenta (para probar el botón «Detener»)
 */
export function buildMockReply(messages: ChatTurn[]): string {
  const userTurns = messages.filter((m) => m.role === "user");
  const last = userTurns[userTurns.length - 1]?.content ?? "";
  const quoted = last.length > 220 ? `${last.slice(0, 220)}…` : last;
  const quote = quoted
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
  // Si el servidor detectó una urgencia, el System Prompt trae la alerta: el simulador también la muestra.
  const alert = messages.find((m) => m.role === "system" && m.content.includes("# ALERTA DE SEGURIDAD"))?.content ?? "";
  const urgent = alert !== "";
  const crisis = alert.includes("crisis emocional");
  return [
    "**Respuesta simulada** · modo demostración, sin IA real",
    "",
    "Recibí tu pregunta:",
    "",
    quote,
    "",
    ...(urgent
      ? [
          "> **Urgente:** si esto está pasando ahora, llama al **123**. Si fue por un medicamento o un producto, llama también a la Línea nacional de toxicología: **018000 916012** (gratuita, 24 horas).",
          "",
          ...(crisis
            ? ["> **Importante:** no tienes que pasar por esto solo. Llama a la **Línea 106** (gratuita, confidencial, 24 horas) y busca a alguien de confianza que esté contigo.", ""]
            : []),
        ]
      : []),
    `Con un modelo real, aquí verías una respuesta con esta estructura. Contexto recibido: **${userTurns.length}** mensaje(s) tuyo(s) en esta conversación.`,
    "",
    "### Qué es y para qué se usa",
    "Una explicación breve y en lenguaje sencillo, sin tecnicismos.",
    "",
    "### Cómo usarlo con seguridad",
    "- Lee el prospecto completo antes de empezar.",
    "- Respeta lo que te indicó tu médico o tu farmacéutico.",
    "",
    "> **Atención:** los avisos importantes se destacan así para que no pasen desapercibidos.",
    "",
    "### Cuándo consultar",
    "- Si aparecen señales de alarma o tienes dudas, consulta a un profesional de la salud.",
    "",
    "> **Consejo:** guarda los medicamentos en su empaque original, lejos del sol y de los niños.",
    "",
    "Para activar el modelo real, define `AI_PROVIDER` y `AI_API_KEY` en tu archivo `.env`.",
  ].join("\n");
}

function* chunkText(text: string): Generator<string> {
  const parts = text.match(/\S+\s*|\s+/g) ?? [text];
  for (let i = 0; i < parts.length; i += 2) yield parts.slice(i, i + 2).join("");
}

export class MockProvider implements ChatProvider {
  readonly id = "mock";
  readonly label = "Simulado (sin IA real)";
  readonly defaultModel = "mock-1";

  async *stream(messages: ChatTurn[], opts: CompletionOptions): AsyncGenerator<string, void, void> {
    // Si quedaron preguntas anteriores sin respuesta, el contexto las une con la nueva (separadas por una
    // línea en blanco): el comando de prueba es siempre lo último que escribió la persona.
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const last = (lastUser.split(/\n{2,}/).pop() ?? "").trim().toLowerCase();
    if (last.startsWith("/error")) {
      await sleep(400, opts.signal);
      throw new AIError("UNAVAILABLE", "error simulado con /error");
    }
    if (last.startsWith("/limite")) {
      await sleep(300, opts.signal);
      throw new AIError("RATE_LIMIT", "error simulado con /limite");
    }
    const delay = last.startsWith("/lento") ? 140 : 22;
    for (const piece of chunkText(buildMockReply(messages))) {
      if (opts.signal?.aborted) throw new AIError("ABORTED");
      await sleep(delay, opts.signal);
      yield piece;
    }
  }

  complete(messages: ChatTurn[], opts: CompletionOptions): Promise<string> {
    return collect(this.stream(messages, opts));
  }
}
