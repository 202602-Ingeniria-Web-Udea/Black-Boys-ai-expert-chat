import { describe, expect, it } from "vitest";
import { AIError } from "@/lib/ai/errors";
import { buildMockReply, MockProvider } from "@/lib/ai/mock";
import { collect, type ChatTurn, type CompletionOptions } from "@/lib/ai/types";
import { detectUrgency, urgencyPromptBlock } from "@/lib/safety/urgency";

const opts: CompletionOptions = { model: "mock-1", temperature: 0.4, maxTokens: 256 };
const ask = (content: string): ChatTurn[] => [
  { role: "system", content: "prompt" },
  { role: "user", content },
];

describe("MockProvider", () => {
  it("responde en varios fragmentos y el texto completo coincide con la respuesta simulada", async () => {
    const turns = ask("¿Qué es una API?");
    const pieces: string[] = [];
    for await (const piece of new MockProvider().stream(turns, opts)) pieces.push(piece);
    expect(pieces.length).toBeGreaterThan(5);
    expect(pieces.join("")).toBe(buildMockReply(turns));
  });

  it("la respuesta cita la pregunta y muestra la estructura de una respuesta real (títulos y avisos)", () => {
    const reply = buildMockReply(ask("Hola mundo"));
    expect(reply).toContain("> Hola mundo");
    expect(reply).toContain("### Qué es y para qué se usa");
    expect(reply).toContain("> **Atención:**");
    expect(reply).toContain("> **Consejo:**");
    expect(reply).not.toContain("> **Urgente:**");
    expect(reply).toMatch(/\*\*1\*\* mensaje/);
  });

  it("no contiene información médica concreta (solo estructura de ejemplo)", () => {
    const reply = buildMockReply(ask("¿Para qué sirve el ibuprofeno?"));
    expect(reply).not.toMatch(/\b\d+\s?(mg|ml)\b/i);
    expect(reply).not.toMatch(/ibuprofeno[^>\n]*(sirve|se usa)/i);
  });

  it("si el servidor detectó una urgencia, muestra el aviso urgente con el 123", () => {
    const turns: ChatTurn[] = [
      { role: "system", content: "prompt\n\n# ALERTA DE SEGURIDAD (detectada automáticamente en el último mensaje)" },
      { role: "user", content: "me tomé varias pastillas de más" },
    ];
    const reply = buildMockReply(turns);
    expect(reply).toContain("> **Urgente:**");
    expect(reply).toContain("123");
    expect(reply).toContain("018000 916012");
  });

  /** Arma el contexto como lo hace el servidor: System Prompt + el bloque de alerta que corresponde al mensaje. */
  const withServerAlert = (text: string): { reply: string; kinds: string[] } => {
    const signal = detectUrgency(text);
    expect(signal).not.toBeNull();
    const turns: ChatTurn[] = [
      { role: "system", content: `prompt\n\n${urgencyPromptBlock(signal!)}` },
      { role: "user", content: text },
    ];
    return { reply: buildMockReply(turns), kinds: signal!.kinds };
  };

  it("ante una crisis emocional, el aviso suma la Línea 106 y recomienda buscar a alguien de confianza", () => {
    const { reply, kinds } = withServerAlert("Me tomé varias pastillas de más porque ya no quiero seguir así. ¿Qué hago?");
    expect(kinds).toContain("crisis");
    expect(reply).toContain("> **Urgente:**");
    expect(reply).toContain("Línea 106");
    expect(reply).toContain("alguien de confianza");
  });

  it("ante una intoxicación sin señales de crisis no menciona la Línea 106", () => {
    const { reply, kinds } = withServerAlert("Me tomé varias pastillas de más por error, ¿qué hago?");
    expect(kinds).not.toContain("crisis");
    expect(reply).toContain("018000 916012");
    expect(reply).not.toContain("106");
  });

  it("cuenta los mensajes del usuario del contexto", () => {
    const turns: ChatTurn[] = [
      { role: "user", content: "uno" },
      { role: "assistant", content: "r" },
      { role: "user", content: "dos" },
    ];
    expect(buildMockReply(turns)).toMatch(/\*\*2\*\* mensaje/);
  });

  it("/error simula una caída del proveedor", async () => {
    await expect(collect(new MockProvider().stream(ask("/error"), opts))).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("/limite simula el límite de solicitudes", async () => {
    await expect(collect(new MockProvider().stream(ask("/limite"), opts))).rejects.toMatchObject({ code: "RATE_LIMIT" });
  });

  it("el comando es lo último que escribió la persona, aunque haya preguntas previas sin respuesta unidas al contexto", async () => {
    await expect(collect(new MockProvider().stream(ask("/error\n\n/limite"), opts))).rejects.toMatchObject({ code: "RATE_LIMIT" });
    const text = await collect(new MockProvider().stream(ask("/error\n\nahora sí, una pregunta normal"), opts));
    expect(text).toContain("Respuesta simulada");
  });

  it("se puede cancelar", async () => {
    const controller = new AbortController();
    controller.abort();
    const error = await collect(new MockProvider().stream(ask("hola"), { ...opts, signal: controller.signal })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AIError);
    expect((error as AIError).code).toBe("ABORTED");
  });
});
