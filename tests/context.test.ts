import { describe, expect, it } from "vitest";
import { buildContext, type HistoryItem } from "@/lib/ai/context";

const u = (content: string): HistoryItem => ({ role: "USER", content });
const a = (content: string): HistoryItem => ({ role: "ASSISTANT", content });

describe("buildContext", () => {
  it("convierte los roles al formato del proveedor", () => {
    expect(buildContext([u("hola"), a("¿en qué te ayudo?"), u("explícame")], { maxMessages: 10 })).toEqual([
      { role: "user", content: "hola" },
      { role: "assistant", content: "¿en qué te ayudo?" },
      { role: "user", content: "explícame" },
    ]);
  });

  it("limita el contexto a los últimos N mensajes", () => {
    const history = [u("1"), a("2"), u("3"), a("4"), u("5")];
    expect(buildContext(history, { maxMessages: 3 }).map((t) => t.content)).toEqual(["3", "4", "5"]);
  });

  it("siempre empieza con un mensaje del usuario", () => {
    const history = [u("1"), a("2"), u("3"), a("4"), u("5")];
    const turns = buildContext(history, { maxMessages: 4 }); // cortaría en «2» (asistente)
    expect(turns[0].role).toBe("user");
    expect(turns.map((t) => t.content)).toEqual(["3", "4", "5"]);
  });

  it("descarta lo más antiguo cuando se excede el presupuesto de caracteres, pero nunca el último mensaje", () => {
    const history = [u("a".repeat(100)), a("b".repeat(100)), u("c".repeat(100))];
    const turns = buildContext(history, { maxMessages: 10, maxChars: 150 });
    expect(turns).toHaveLength(1);
    expect(turns[0].content).toBe("c".repeat(100));
  });

  it("conserva el último mensaje aunque por sí solo supere el presupuesto", () => {
    const turns = buildContext([u("x".repeat(500))], { maxMessages: 10, maxChars: 100 });
    expect(turns).toHaveLength(1);
  });

  it("une los mensajes consecutivos del mismo rol (pregunta que falló + pregunta nueva)", () => {
    const turns = buildContext([u("primera"), a("respuesta"), u("falló"), u("segunda")], { maxMessages: 10 });
    expect(turns).toEqual([
      { role: "user", content: "primera" },
      { role: "assistant", content: "respuesta" },
      { role: "user", content: "falló\n\nsegunda" },
    ]);
  });

  it("no altera el historial recibido", () => {
    const history = [u("falló"), u("segunda")];
    buildContext(history, { maxMessages: 10 });
    expect(history.map((m) => m.content)).toEqual(["falló", "segunda"]);
  });
});
