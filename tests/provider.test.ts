import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIError } from "@/lib/ai/errors";
import { describeProvider, getProvider, resolveModel } from "@/lib/ai/provider";

const KEYS = ["AI_PROVIDER", "AI_API_KEY", "AI_BASE_URL", "AI_MODEL", "GROQ_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "OPENAI_API_KEY", "OLLAMA_API_KEY"];

beforeEach(() => {
  for (const key of KEYS) vi.stubEnv(key, "");
});
afterEach(() => vi.unstubAllEnvs());

describe("describeProvider", () => {
  it("sin configuración usa el proveedor simulado", () => {
    const info = describeProvider();
    expect(info).toMatchObject({ id: "mock", isMock: true, configured: true });
  });

  it("un proveedor con clave requerida avisa si falta la clave", () => {
    vi.stubEnv("AI_PROVIDER", "groq");
    const info = describeProvider();
    expect(info.configured).toBe(false);
    expect(info.problem).toMatch(/AI_API_KEY/);
  });

  it("acepta la clave genérica AI_API_KEY o la específica del proveedor", () => {
    vi.stubEnv("AI_PROVIDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "gsk_prueba");
    expect(describeProvider()).toMatchObject({ configured: true, endpoint: "api.groq.com" });
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("AI_API_KEY", "otra-clave");
    expect(describeProvider().configured).toBe(true);
  });

  it("Gemini acepta GEMINI_API_KEY y GOOGLE_API_KEY", () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GOOGLE_API_KEY", "x");
    expect(describeProvider().configured).toBe(true);
  });

  it("Ollama no necesita clave", () => {
    vi.stubEnv("AI_PROVIDER", "ollama");
    expect(describeProvider()).toMatchObject({ configured: true, defaultModel: "llama3.2", endpoint: "localhost:11434" });
  });

  it("el proveedor personalizado exige AI_BASE_URL", () => {
    vi.stubEnv("AI_PROVIDER", "custom");
    expect(describeProvider().problem).toMatch(/AI_BASE_URL/);
    vi.stubEnv("AI_BASE_URL", "http://localhost:8000/v1");
    vi.stubEnv("AI_MODEL", "mi-modelo");
    expect(describeProvider()).toMatchObject({ configured: true, defaultModel: "mi-modelo" });
  });

  it("rechaza una AI_BASE_URL mal formada", () => {
    vi.stubEnv("AI_PROVIDER", "custom");
    vi.stubEnv("AI_BASE_URL", "esto no es una url");
    vi.stubEnv("AI_MODEL", "m");
    expect(describeProvider().configured).toBe(false);
  });

  it("rechaza un proveedor desconocido y lista los válidos", () => {
    vi.stubEnv("AI_PROVIDER", "inventado");
    const info = describeProvider();
    expect(info.configured).toBe(false);
    expect(info.problem).toMatch(/mock, groq, gemini, openai, ollama o custom/);
  });

  it("nunca expone la clave en la descripción", () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-secreta-1234567890");
    expect(JSON.stringify(describeProvider())).not.toContain("sk-secreta");
  });
});

describe("getProvider / resolveModel", () => {
  it("devuelve el simulado por defecto", () => {
    expect(getProvider().id).toBe("mock");
  });

  it("lanza un AIError CONFIG si falta la configuración", () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    try {
      getProvider();
      throw new Error("debió fallar");
    } catch (err) {
      expect(err).toBeInstanceOf(AIError);
      expect((err as AIError).code).toBe("CONFIG");
    }
  });

  it("crea el cliente real cuando todo está configurado", () => {
    vi.stubEnv("AI_PROVIDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "gsk_prueba");
    expect(getProvider()).toMatchObject({ id: "groq", defaultModel: "openai/gpt-oss-20b" });
  });

  it("prioridad del modelo: panel de administración > AI_MODEL > modelo por defecto", () => {
    const provider = getProvider();
    expect(resolveModel(provider, null)).toBe("mock-1");
    vi.stubEnv("AI_MODEL", "desde-env");
    expect(resolveModel(provider, null)).toBe("desde-env");
    expect(resolveModel(provider, "  desde-panel  ")).toBe("desde-panel");
    expect(resolveModel(provider, "   ")).toBe("desde-env");
  });
});
