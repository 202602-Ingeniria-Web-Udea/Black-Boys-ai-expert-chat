import { describe, expect, it } from "vitest";
import { encodeSSE, parseSSE, type SSEEvent } from "@/lib/sse";

/** Crea un ReadableStream que entrega los textos tal cual (permite partir eventos a mitad). */
function streamOf(...parts: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      controller.close();
    },
  });
}

async function readAll(body: ReadableStream<Uint8Array>): Promise<SSEEvent[]> {
  const events: SSEEvent[] = [];
  for await (const evt of parseSSE(body)) events.push(evt);
  return events;
}

describe("parseSSE", () => {
  it("lee eventos con nombre y datos", async () => {
    const events = await readAll(streamOf('event: delta\ndata: {"text":"hola"}\n\nevent: done\ndata: {}\n\n'));
    expect(events).toEqual([
      { event: "delta", data: '{"text":"hola"}' },
      { event: "done", data: "{}" },
    ]);
  });

  it("usa «message» cuando no hay nombre de evento", async () => {
    expect(await readAll(streamOf("data: hola\n\n"))).toEqual([{ event: "message", data: "hola" }]);
  });

  it("reconstruye eventos partidos en varios fragmentos de red", async () => {
    const events = await readAll(streamOf("eve", "nt: delta\nda", 'ta: {"a":1}', "\n", "\nevent: done\ndata: 2\n\n"));
    expect(events).toEqual([
      { event: "delta", data: '{"a":1}' },
      { event: "done", data: "2" },
    ]);
  });

  it("no corrompe caracteres multibyte partidos entre fragmentos", async () => {
    const bytes = new TextEncoder().encode("data: canción ñandú 🙂\n\n");
    const cut = bytes.indexOf(0xc3) + 1; // parte la «ó» por la mitad
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, cut));
        controller.enqueue(bytes.slice(cut));
        controller.close();
      },
    });
    expect(await readAll(body)).toEqual([{ event: "message", data: "canción ñandú 🙂" }]);
  });

  it("acepta saltos de línea CRLF", async () => {
    expect(await readAll(streamOf("event: x\r\ndata: 1\r\n\r\ndata: 2\r\n\r\n"))).toEqual([
      { event: "x", data: "1" },
      { event: "message", data: "2" },
    ]);
  });

  it("ignora comentarios y bloques sin datos", async () => {
    expect(await readAll(streamOf(": keep-alive\n\nevent: ping\n\ndata: real\n\n"))).toEqual([{ event: "message", data: "real" }]);
  });

  it("une varias líneas data con salto de línea", async () => {
    expect(await readAll(streamOf("data: línea 1\ndata: línea 2\n\n"))).toEqual([{ event: "message", data: "línea 1\nlínea 2" }]);
  });

  it("entrega el último evento aunque falte la línea en blanco final", async () => {
    expect(await readAll(streamOf("data: sin cierre"))).toEqual([{ event: "message", data: "sin cierre" }]);
  });

  it("encodeSSE y parseSSE son inversos", async () => {
    const payload = { texto: "¿Qué tal?\nSegunda línea", n: 3 };
    const [evt] = await readAll(streamOf(encodeSSE("delta", payload)));
    expect(evt.event).toBe("delta");
    expect(JSON.parse(evt.data)).toEqual(payload);
  });
});
