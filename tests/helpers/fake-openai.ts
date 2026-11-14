import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

/** Petición recibida por el servidor falso (ya con el cuerpo JSON leído). */
export interface RecordedRequest {
  method: string;
  url: string;
  headers: IncomingMessage["headers"];
  body: Record<string, unknown>;
}

export type FakeHandler = (req: RecordedRequest, res: ServerResponse, attempt: number) => void | Promise<void>;

/** Servidor HTTP mínimo que imita `POST /chat/completions` de un proveedor compatible con OpenAI. */
export class FakeOpenAI {
  private server: Server | null = null;
  readonly requests: RecordedRequest[] = [];
  handler: FakeHandler = (_req, res) => streamText(res, ["ok"]);
  baseUrl = "";

  async start(): Promise<void> {
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        let body: Record<string, unknown> = {};
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        } catch {
          /* cuerpo no JSON */
        }
        const recorded: RecordedRequest = { method: req.method ?? "", url: req.url ?? "", headers: req.headers, body };
        this.requests.push(recorded);
        void Promise.resolve(this.handler(recorded, res, this.requests.length));
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(0, "127.0.0.1", resolve));
    const { port } = this.server.address() as AddressInfo;
    this.baseUrl = `http://127.0.0.1:${port}/v1`;
  }

  reset(handler?: FakeHandler): void {
    this.requests.length = 0;
    if (handler) this.handler = handler;
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    this.server = null;
  }
}

export function sseHead(res: ServerResponse): void {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
}

export function sseData(res: ServerResponse, payload: unknown): void {
  res.write(`data: ${typeof payload === "string" ? payload : JSON.stringify(payload)}\n\n`);
}

export const deltaChunk = (content: string | null, finish: string | null = null) => ({
  choices: [{ delta: content === null ? {} : { content }, finish_reason: finish }],
});

/** Responde con un stream SSE estándar: un fragmento por cada texto y `[DONE]` al final. */
export function streamText(res: ServerResponse, pieces: string[], opts: { finish?: string; done?: boolean } = {}): void {
  sseHead(res);
  for (const piece of pieces) sseData(res, deltaChunk(piece));
  sseData(res, deltaChunk(null, opts.finish ?? "stop"));
  if (opts.done !== false) sseData(res, "[DONE]");
  res.end();
}

export function jsonError(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { message } }));
}
