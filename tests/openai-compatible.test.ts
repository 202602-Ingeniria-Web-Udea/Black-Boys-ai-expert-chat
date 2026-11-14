import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AIError } from "@/lib/ai/errors";
import { OpenAICompatibleProvider, type OpenAICompatConfig } from "@/lib/ai/openai-compatible";
import type { ChatTurn, CompletionOptions } from "@/lib/ai/types";
import { collect } from "@/lib/ai/types";
import { deltaChunk, FakeOpenAI, jsonError, sseData, sseHead, streamText } from "./helpers/fake-openai";

const fake = new FakeOpenAI();
const messages: ChatTurn[] = [
  { role: "system", content: "Eres un mentor." },
  { role: "user", content: "Hola" },
];

let counter = 0;
/** Cada prueba usa un modelo distinto: el cliente recuerda los ajustes que aprendió por modelo. */
const uniqueModel = (prefix = "test-model") => `${prefix}-${++counter}`;

function opts(model = uniqueModel(), extra: Partial<CompletionOptions> = {}): CompletionOptions {
  return { model, temperature: 0.4, maxTokens: 256, ...extra };
}

function provider(extra: Partial<OpenAICompatConfig> = {}) {
  return new OpenAICompatibleProvider({
    id: "custom",
    label: "Prueba",
    baseUrl: fake.baseUrl,
    apiKey: "clave-de-prueba",
    defaultModel: "m",
    tokenParam: "max_tokens",
    timeoutMs: 5_000,
    maxRetries: 1,
    ...extra,
  });
}

async function failure(promise: Promise<unknown>): Promise<AIError> {
  try {
    await promise;
  } catch (err) {
    expect(err).toBeInstanceOf(AIError);
    return err as AIError;
  }
  throw new Error("Se esperaba un AIError y la llamada terminó bien");
}

beforeAll(() => fake.start());
afterAll(() => fake.stop());
beforeEach(() => fake.reset((_req, res) => streamText(res, ["ok"])));

describe("OpenAICompatibleProvider · lectura del stream", () => {
  it("entrega los fragmentos en orden y envía la petición correcta", async () => {
    fake.reset((_req, res) => streamText(res, ["Hola", ", ", "mundo"]));
    const model = uniqueModel();
    const pieces: string[] = [];
    for await (const piece of provider().stream(messages, opts(model))) pieces.push(piece);

    expect(pieces).toEqual(["Hola", ", ", "mundo"]);
    const [request] = fake.requests;
    expect(request.method).toBe("POST");
    expect(request.url).toBe("/v1/chat/completions");
    expect(request.headers.authorization).toBe("Bearer clave-de-prueba");
    expect(request.body).toMatchObject({ model, stream: true, max_tokens: 256, temperature: 0.4, messages });
  });

  it("no envía Authorization cuando no hay clave (Ollama local)", async () => {
    await collect(provider({ apiKey: undefined }).stream(messages, opts()));
    expect(fake.requests[0].headers.authorization).toBeUndefined();
  });

  it("usa max_completion_tokens cuando el proveedor lo requiere", async () => {
    await collect(provider({ tokenParam: "max_completion_tokens" }).stream(messages, opts()));
    expect(fake.requests[0].body).toHaveProperty("max_completion_tokens", 256);
    expect(fake.requests[0].body).not.toHaveProperty("max_tokens");
  });

  it("envía reasoning_effort solo si está configurado", async () => {
    await collect(provider({ reasoningEffort: "low" }).stream(messages, opts()));
    expect(fake.requests[0].body).toHaveProperty("reasoning_effort", "low");
    fake.reset();
    await collect(provider().stream(messages, opts()));
    expect(fake.requests[0].body).not.toHaveProperty("reasoning_effort");
  });

  it("no envía temperature a los modelos de razonamiento de OpenAI (gpt-5, o1…)", async () => {
    await collect(provider().stream(messages, opts("gpt-5-mini")));
    expect(fake.requests[0].body).not.toHaveProperty("temperature");
  });

  it("complete() devuelve el texto concatenado", async () => {
    fake.reset((_req, res) => streamText(res, ["Tí", "tulo"]));
    await expect(provider().complete(messages, opts())).resolves.toBe("Título");
  });

  it("ignora comentarios y líneas que no son JSON, y termina en [DONE]", async () => {
    fake.reset((_req, res) => {
      sseHead(res);
      res.write(": keep-alive\n\n");
      sseData(res, "esto no es json");
      sseData(res, deltaChunk("Hola"));
      sseData(res, "[DONE]");
      sseData(res, deltaChunk("NO DEBE APARECER"));
      res.end();
    });
    await expect(collect(provider().stream(messages, opts()))).resolves.toBe("Hola");
  });

  it("filtra los bloques <think> aunque las etiquetas lleguen partidas", async () => {
    fake.reset((_req, res) => streamText(res, ["<thi", "nk>razonando en voz alta</thi", "nk>\n\nRespuesta", " final"]));
    await expect(collect(provider().stream(messages, opts()))).resolves.toBe("Respuesta final");
  });

  it("acepta un JSON completo cuando el servidor ignora stream:true", async () => {
    fake.reset((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { content: "Hola desde JSON" } }] }));
    });
    await expect(collect(provider().stream(messages, opts()))).resolves.toBe("Hola desde JSON");
  });
});

describe("OpenAICompatibleProvider · respuestas vacías o cortadas", () => {
  it("lanza EMPTY si el modelo no devuelve contenido", async () => {
    fake.reset((_req, res) => streamText(res, []));
    const err = await failure(collect(provider().stream(messages, opts())));
    expect(err.code).toBe("EMPTY");
  });

  it("lanza TOKEN_LIMIT si se agotaron los tokens sin texto visible (modelos de razonamiento)", async () => {
    fake.reset((_req, res) => streamText(res, [], { finish: "length" }));
    const err = await failure(collect(provider().stream(messages, opts())));
    expect(err.code).toBe("TOKEN_LIMIT");
    expect(err.message).toMatch(/Longitud máxima de respuesta/);
  });

  it("un error enviado a mitad del stream se traduce a un AIError", async () => {
    fake.reset((_req, res) => {
      sseHead(res);
      sseData(res, deltaChunk("Parcial"));
      sseData(res, { error: { message: "overloaded", code: 503 } });
      res.end();
    });
    const pieces: string[] = [];
    const err = await failure(
      (async () => {
        for await (const piece of provider().stream(messages, opts())) pieces.push(piece);
      })(),
    );
    expect(pieces).toEqual(["Parcial"]);
    expect(err.code).toBe("UNAVAILABLE");
  });
});

describe("OpenAICompatibleProvider · adaptación automática ante errores 400", () => {
  it("cambia max_tokens por max_completion_tokens y reintenta", async () => {
    fake.reset((req, res) => {
      if ("max_tokens" in req.body) return jsonError(res, 400, "Unsupported parameter: 'max_tokens'. Use 'max_completion_tokens' instead.");
      streamText(res, ["listo"]);
    });
    const model = uniqueModel();
    await expect(collect(provider().stream(messages, opts(model)))).resolves.toBe("listo");
    expect(fake.requests).toHaveLength(2);
    expect(fake.requests[1].body).toHaveProperty("max_completion_tokens", 256);

    // Lo aprendido se recuerda: la siguiente llamada ya no repite el error 400.
    fake.requests.length = 0;
    await collect(provider().stream(messages, opts(model)));
    expect(fake.requests).toHaveLength(1);
    expect(fake.requests[0].body).toHaveProperty("max_completion_tokens");
  });

  it("quita temperature si el modelo no la acepta", async () => {
    fake.reset((req, res) => {
      if ("temperature" in req.body) return jsonError(res, 400, "Unsupported value: 'temperature' does not support 0.4 with this model.");
      streamText(res, ["sin temperatura"]);
    });
    await expect(collect(provider().stream(messages, opts()))).resolves.toBe("sin temperatura");
    expect(fake.requests).toHaveLength(2);
    expect(fake.requests[1].body).not.toHaveProperty("temperature");
  });

  it("quita reasoning_effort si el modelo no lo soporta", async () => {
    fake.reset((req, res) => {
      if ("reasoning_effort" in req.body) return jsonError(res, 400, "Unrecognized request argument supplied: reasoning_effort");
      streamText(res, ["ok sin razonamiento"]);
    });
    await expect(collect(provider({ reasoningEffort: "low" }).stream(messages, opts()))).resolves.toBe("ok sin razonamiento");
    expect(fake.requests[1].body).not.toHaveProperty("reasoning_effort");
  });

  it("un 400 que no se puede corregir se informa como BAD_REQUEST sin reintentar", async () => {
    fake.reset((_req, res) => jsonError(res, 400, "messages: array too long"));
    const err = await failure(collect(provider().stream(messages, opts())));
    expect(err.code).toBe("BAD_REQUEST");
    expect(fake.requests).toHaveLength(1);
  });
});

describe("OpenAICompatibleProvider · errores HTTP", () => {
  it.each([
    [401, "AUTH"],
    [403, "AUTH"],
    [404, "MODEL_NOT_FOUND"],
    [429, "RATE_LIMIT"],
  ])("HTTP %i → %s (sin reintentos)", async (status, code) => {
    fake.reset((_req, res) => jsonError(res, status, "fallo"));
    const err = await failure(collect(provider().stream(messages, opts())));
    expect(err.code).toBe(code);
    expect(fake.requests).toHaveLength(1);
  });

  it("no filtra la clave de API ni en el mensaje ni en el detalle", async () => {
    fake.reset((_req, res) => jsonError(res, 401, "Incorrect API key provided: sk-abcdefghijklmnop1234"));
    const err = await failure(collect(provider().stream(messages, opts())));
    expect(err.message).not.toMatch(/sk-/);
    expect(err.detail).not.toMatch(/sk-abcdefghijklmnop1234/);
    expect(err.detail).toContain("[redactado]");
  });

  it("reintenta una vez ante un 503 transitorio y se recupera", async () => {
    fake.reset((_req, res, attempt) => (attempt === 1 ? jsonError(res, 503, "sobrecargado") : streamText(res, ["recuperado"])));
    await expect(collect(provider().stream(messages, opts()))).resolves.toBe("recuperado");
    expect(fake.requests).toHaveLength(2);
  });

  it("si el 5xx persiste, agota los reintentos y devuelve UNAVAILABLE", async () => {
    fake.reset((_req, res) => jsonError(res, 500, "caído"));
    const err = await failure(collect(provider({ maxRetries: 1 }).stream(messages, opts())));
    expect(err.code).toBe("UNAVAILABLE");
    expect(fake.requests).toHaveLength(2);
  });

  it("sin reintentos configurados falla de inmediato", async () => {
    fake.reset((_req, res) => jsonError(res, 502, "bad gateway"));
    const err = await failure(collect(provider({ maxRetries: 0 }).stream(messages, opts())));
    expect(err.code).toBe("UNAVAILABLE");
    expect(fake.requests).toHaveLength(1);
  });
});

describe("OpenAICompatibleProvider · red, tiempo y cancelación", () => {
  it("si no hay conexión con el servidor devuelve UNAVAILABLE", async () => {
    const err = await failure(collect(provider({ baseUrl: "http://127.0.0.1:1/v1", maxRetries: 0 }).stream(messages, opts())));
    expect(err.code).toBe("UNAVAILABLE");
  });

  it("devuelve TIMEOUT si el proveedor no responde a tiempo", async () => {
    fake.reset(() => {
      /* nunca responde */
    });
    const started = Date.now();
    const err = await failure(collect(provider({ timeoutMs: 250, maxRetries: 0 }).stream(messages, opts())));
    expect(err.code).toBe("TIMEOUT");
    expect(Date.now() - started).toBeLessThan(3_000);
  });

  it("cancelar a mitad del stream produce ABORTED y conserva lo ya recibido", async () => {
    fake.reset((_req, res) => {
      sseHead(res);
      sseData(res, deltaChunk("Primer fragmento"));
      /* y se queda esperando */
    });
    const controller = new AbortController();
    const pieces: string[] = [];
    const err = await failure(
      (async () => {
        for await (const piece of provider().stream(messages, opts(uniqueModel(), { signal: controller.signal }))) {
          pieces.push(piece);
          controller.abort();
        }
      })(),
    );
    expect(pieces).toEqual(["Primer fragmento"]);
    expect(err.code).toBe("ABORTED");
  });
});
