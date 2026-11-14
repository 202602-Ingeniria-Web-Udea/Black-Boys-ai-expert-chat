import { parseSSE } from "@/lib/sse";
import { AIError, aiErrorFromHttp } from "./errors";
import { ThinkTagFilter } from "./think-filter";
import { collect, sleep, type ChatProvider, type ChatTurn, type CompletionOptions } from "./types";

export interface OpenAICompatConfig {
  id: string;
  label: string;
  /** URL base del API compatible con OpenAI, sin la barra final (…/v1). */
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  /** Nombre del parámetro de límite de salida: depende del proveedor/modelo. */
  tokenParam: "max_tokens" | "max_completion_tokens";
  reasoningEffort?: string;
  /** Tiempo máximo total (conexión + generación) en ms. */
  timeoutMs: number;
  /** Reintentos ante errores transitorios (5xx / red) antes del primer token. */
  maxRetries: number;
  fetchImpl?: typeof fetch;
}

interface RequestState {
  tokenParam: "max_tokens" | "max_completion_tokens";
  sendTemperature: boolean;
  reasoningEffort?: string;
}

interface ChatChunk {
  error?: { message?: string; code?: number | string };
  choices?: Array<{
    delta?: { content?: string | null };
    message?: { content?: string | null };
    finish_reason?: string | null;
  }>;
}

// Ajustes que un modelo/proveedor "enseñó" que necesita. Evita repetir el 400 en cada mensaje.
const learned = new Map<string, Partial<RequestState>>();

/** Los modelos de razonamiento de OpenAI (gpt-5, o1/o3/o4) solo aceptan la temperatura por defecto. */
function rejectsTemperature(model: string): boolean {
  return /(^|\/)(gpt-5|o[134])/i.test(model);
}

/**
 * Interpreta un error 400 y ajusta la petición para reintentarla.
 * Cubre las diferencias típicas entre proveedores "compatibles con OpenAI":
 *  - max_tokens ↔ max_completion_tokens
 *  - temperature no soportada (modelos de razonamiento)
 *  - reasoning_effort no soportado
 */
export function adaptRequest(state: RequestState, errorText: string): boolean {
  const t = errorText.toLowerCase();
  let changed = false;
  if (state.tokenParam === "max_tokens" && t.includes("max_tokens")) {
    state.tokenParam = "max_completion_tokens";
    changed = true;
  } else if (state.tokenParam === "max_completion_tokens" && t.includes("max_completion_tokens")) {
    state.tokenParam = "max_tokens";
    changed = true;
  }
  if (state.sendTemperature && t.includes("temperature")) {
    state.sendTemperature = false;
    changed = true;
  }
  if (state.reasoningEffort && t.includes("reasoning")) {
    state.reasoningEffort = undefined;
    changed = true;
  }
  return changed;
}

function isTransient(status: number): boolean {
  return [408, 425, 500, 502, 503, 504].includes(status);
}

function mapThrown(err: unknown, userSignal?: AbortSignal, timeoutSignal?: AbortSignal): AIError {
  if (err instanceof AIError) return err;
  if (userSignal?.aborted) return new AIError("ABORTED");
  if (timeoutSignal?.aborted) return new AIError("TIMEOUT", "tiempo de espera agotado");
  const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } } | null;
  if (e?.name === "TimeoutError" || e?.name === "AbortError") return new AIError("TIMEOUT", e.message);
  const detail = `${e?.cause?.code ?? e?.name ?? "error"}: ${e?.cause?.message ?? e?.message ?? ""}`;
  return new AIError("UNAVAILABLE", detail);
}

/** Cliente para cualquier API compatible con `POST /chat/completions` de OpenAI (OpenAI, Groq, Gemini, Ollama...). */
export class OpenAICompatibleProvider implements ChatProvider {
  readonly id: string;
  readonly label: string;
  readonly defaultModel: string;

  constructor(private readonly cfg: OpenAICompatConfig) {
    this.id = cfg.id;
    this.label = cfg.label;
    this.defaultModel = cfg.defaultModel;
  }

  async *stream(messages: ChatTurn[], opts: CompletionOptions): AsyncGenerator<string, void, void> {
    const cacheKey = `${this.cfg.baseUrl}|${opts.model}`;
    const state: RequestState = {
      tokenParam: this.cfg.tokenParam,
      sendTemperature: !rejectsTemperature(opts.model),
      reasoningEffort: this.cfg.reasoningEffort,
      ...learned.get(cacheKey),
    };
    const timeoutSignal = AbortSignal.timeout(this.cfg.timeoutMs);
    const signal = opts.signal ? AbortSignal.any([opts.signal, timeoutSignal]) : timeoutSignal;
    const doFetch = this.cfg.fetchImpl ?? fetch;
    let adaptations = 0;
    let retries = 0;

    for (;;) {
      const body: Record<string, unknown> = {
        model: opts.model,
        messages,
        stream: true,
        [state.tokenParam]: opts.maxTokens,
      };
      if (state.sendTemperature) body.temperature = opts.temperature;
      if (state.reasoningEffort) body.reasoning_effort = state.reasoningEffort;

      let res: Response;
      try {
        res = await doFetch(`${this.cfg.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream, application/json",
            ...(this.cfg.apiKey ? { Authorization: `Bearer ${this.cfg.apiKey}` } : {}),
          },
          body: JSON.stringify(body),
          signal,
        });
      } catch (err) {
        const mapped = mapThrown(err, opts.signal, timeoutSignal);
        if (mapped.code === "UNAVAILABLE" && retries < this.cfg.maxRetries) {
          retries++;
          await sleep(500 * retries, signal);
          continue;
        }
        throw mapped;
      }

      if (res.ok) {
        learned.set(cacheKey, { ...state });
        try {
          yield* this.readResponse(res);
        } catch (err) {
          throw mapThrown(err, opts.signal, timeoutSignal);
        }
        return;
      }

      const text = await res.text().catch(() => "");
      if (res.status === 400 && adaptations < 3 && adaptRequest(state, text)) {
        adaptations++;
        continue;
      }
      if (isTransient(res.status) && retries < this.cfg.maxRetries) {
        retries++;
        await sleep(500 * retries, signal);
        continue;
      }
      throw aiErrorFromHttp(res.status, text);
    }
  }

  complete(messages: ChatTurn[], opts: CompletionOptions): Promise<string> {
    return collect(this.stream(messages, opts));
  }

  private async *readResponse(res: Response): AsyncGenerator<string, void, void> {
    if (!res.body) throw new AIError("UNAVAILABLE", "respuesta sin cuerpo");

    // Algunos servidores ignoran `stream: true` y devuelven un JSON completo.
    if ((res.headers.get("content-type") ?? "").includes("application/json")) {
      const json = (await res.json()) as ChatChunk;
      const text = json.choices?.[0]?.message?.content ?? "";
      if (!text) throw new AIError("EMPTY", "JSON sin contenido");
      yield text;
      return;
    }

    const filter = new ThinkTagFilter();
    let emitted = false;
    let finish: string | null | undefined;

    for await (const evt of parseSSE(res.body)) {
      if (evt.data === "[DONE]") break;
      let chunk: ChatChunk;
      try {
        chunk = JSON.parse(evt.data) as ChatChunk;
      } catch {
        continue; // línea que no es JSON (keep-alive del proveedor)
      }
      if (chunk.error) {
        const code = Number(chunk.error.code);
        throw aiErrorFromHttp(Number.isFinite(code) && code >= 400 ? code : 500, JSON.stringify(chunk.error));
      }
      const choice = chunk.choices?.[0];
      const piece = choice?.delta?.content;
      if (typeof piece === "string" && piece.length > 0) {
        const visible = filter.push(piece);
        if (visible) {
          emitted = true;
          yield visible;
        }
      }
      if (choice?.finish_reason) finish = choice.finish_reason;
    }

    const tail = filter.flush();
    if (tail) {
      emitted = true;
      yield tail;
    }
    if (!emitted) {
      throw new AIError(finish === "length" ? "TOKEN_LIMIT" : "EMPTY", `finish_reason=${finish ?? "n/a"}`);
    }
  }
}
