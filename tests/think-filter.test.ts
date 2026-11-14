import { describe, expect, it } from "vitest";
import { ThinkTagFilter } from "@/lib/ai/think-filter";

function run(...chunks: string[]): string {
  const filter = new ThinkTagFilter();
  return chunks.map((c) => filter.push(c)).join("") + filter.flush();
}

describe("ThinkTagFilter", () => {
  it("deja pasar el texto normal sin cambios", () => {
    expect(run("Hola ", "mundo")).toBe("Hola mundo");
  });

  it("elimina un bloque <think> completo", () => {
    expect(run("<think>pensando…</think>Respuesta")).toBe("Respuesta");
  });

  it("elimina el bloque aunque las etiquetas lleguen partidas", () => {
    expect(run("<th", "ink>ra", "zonando</thi", "nk>Hola")).toBe("Hola");
  });

  it("recorta los saltos de línea que siguen al bloque", () => {
    expect(run("<think>x</think>\n\n  Texto")).toBe("Texto");
  });

  it("conserva el texto anterior al bloque", () => {
    expect(run("Antes <think>oculto</think>después")).toBe("Antes después");
  });

  it("descarta un bloque que nunca se cierra", () => {
    expect(run("Visible<think>razonamiento sin cierre")).toBe("Visible");
  });

  it("no retiene un «<» que no es una etiqueta", () => {
    expect(run("if (a < b) { return 1 }")).toBe("if (a < b) { return 1 }");
  });

  it("libera un prefijo de etiqueta pendiente al terminar", () => {
    expect(run("a <thi")).toBe("a <thi");
  });

  it("maneja varios bloques en la misma respuesta", () => {
    expect(run("<think>a</think>Uno <think>b</think>Dos")).toBe("Uno Dos");
  });
});
