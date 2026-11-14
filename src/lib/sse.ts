// Parser de Server-Sent Events (SSE) sobre un ReadableStream.
// Se usa tanto en el servidor (para leer el stream del proveedor de IA)
// como en el navegador (para leer el stream que entrega nuestra API).

export interface SSEEvent {
  event: string;
  data: string;
}

function parseBlock(block: string): SSEEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue; // comentarios / keep-alive
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  return data.length ? { event, data: data.join("\n") } : null;
}

export async function* parseSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<SSEEvent, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const evt = parseBlock(block);
        if (evt) yield evt;
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      const evt = parseBlock(buffer.replace(/\r\n/g, "\n"));
      if (evt) yield evt;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* el stream ya estaba cerrado */
    }
  }
}

/** Serializa un evento SSE con payload JSON. */
export function encodeSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
