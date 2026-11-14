export type ChatRole = "system" | "user" | "assistant";

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export interface CompletionOptions {
  model: string;
  temperature: number;
  maxTokens: number;
  signal?: AbortSignal;
}

/** Contrato común de todos los proveedores de IA (simulado, OpenAI, Groq, Gemini, Ollama...). */
export interface ChatProvider {
  readonly id: string;
  readonly label: string;
  readonly defaultModel: string;
  /** Devuelve la respuesta en fragmentos de texto a medida que el modelo la genera. */
  stream(messages: ChatTurn[], opts: CompletionOptions): AsyncGenerator<string, void, void>;
  /** Devuelve la respuesta completa (se usa para títulos y para las pruebas automáticas). */
  complete(messages: ChatTurn[], opts: CompletionOptions): Promise<string>;
}

export async function collect(stream: AsyncGenerator<string, void, void>): Promise<string> {
  let text = "";
  for await (const piece of stream) text += piece;
  return text;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
