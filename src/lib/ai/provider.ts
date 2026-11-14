import { envInt, envString } from "@/lib/env";
import { AIError } from "./errors";
import { MockProvider } from "./mock";
import { OpenAICompatibleProvider } from "./openai-compatible";
import type { ChatProvider } from "./types";

interface Preset {
  label: string;
  baseUrl?: string;
  defaultModel: string;
  tokenParam: "max_tokens" | "max_completion_tokens";
  reasoningEffort?: string;
  keyEnv: string[];
  requiresKey: boolean;
  requiresBaseUrl?: boolean;
}

/**
 * Proveedores soportados. Todos hablan el protocolo «Chat Completions» de OpenAI,
 * por lo que se usa un único cliente. Los nombres de modelo cambian con frecuencia:
 * se pueden sobrescribir con AI_MODEL o desde el panel de administración.
 */
const PRESETS: Record<string, Preset> = {
  groq: {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "openai/gpt-oss-20b",
    tokenParam: "max_completion_tokens",
    reasoningEffort: "low",
    keyEnv: ["GROQ_API_KEY"],
    requiresKey: true,
  },
  gemini: {
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-flash-latest",
    tokenParam: "max_tokens",
    reasoningEffort: "low",
    keyEnv: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    requiresKey: true,
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5-mini",
    tokenParam: "max_completion_tokens",
    reasoningEffort: "low",
    keyEnv: ["OPENAI_API_KEY"],
    requiresKey: true,
  },
  ollama: {
    label: "Ollama",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    tokenParam: "max_tokens",
    keyEnv: ["OLLAMA_API_KEY"],
    requiresKey: false,
  },
  custom: {
    label: "Personalizado (compatible con OpenAI)",
    defaultModel: "",
    tokenParam: "max_tokens",
    keyEnv: [],
    requiresKey: false,
    requiresBaseUrl: true,
  },
};

export interface ProviderInfo {
  id: string;
  label: string;
  isMock: boolean;
  /** Modelo efectivo si el administrador no lo cambia en el panel. */
  defaultModel: string;
  configured: boolean;
  /** Qué falta configurar (solo texto para el administrador). */
  problem?: string;
  /** Host del endpoint (sin ruta ni credenciales). */
  endpoint?: string;
}

function providerId(): string {
  return (envString("AI_PROVIDER") ?? "mock").toLowerCase();
}

function resolveApiKey(preset: Preset): string | undefined {
  return envString("AI_API_KEY") ?? preset.keyEnv.map((k) => envString(k)).find(Boolean);
}

/** Describe el proveedor activo sin exponer secretos (se muestra en el panel de administración). */
export function describeProvider(): ProviderInfo {
  const id = providerId();
  if (id === "mock") {
    return { id, label: "Simulado (sin IA real)", isMock: true, defaultModel: "mock-1", configured: true };
  }
  const preset = PRESETS[id];
  if (!preset) {
    return {
      id,
      label: id,
      isMock: false,
      defaultModel: "",
      configured: false,
      problem: `AI_PROVIDER «${id}» no es válido. Usa: mock, groq, gemini, openai, ollama o custom.`,
    };
  }
  const baseUrl = envString("AI_BASE_URL") ?? preset.baseUrl;
  const model = envString("AI_MODEL") ?? preset.defaultModel;
  let problem: string | undefined;
  if (preset.requiresKey && !resolveApiKey(preset)) problem = "Falta AI_API_KEY.";
  else if (preset.requiresBaseUrl && !baseUrl) problem = "Falta AI_BASE_URL.";
  else if (!model) problem = "Falta AI_MODEL.";
  let endpoint: string | undefined;
  try {
    endpoint = baseUrl ? new URL(baseUrl).host : undefined;
  } catch {
    problem = problem ?? "AI_BASE_URL no es una URL válida.";
  }
  return { id, label: preset.label, isMock: false, defaultModel: model, configured: !problem, problem, endpoint };
}

/** Crea el proveedor activo según las variables de entorno. */
export function getProvider(): ChatProvider {
  const info = describeProvider();
  if (info.isMock) return new MockProvider();
  if (!info.configured) throw new AIError("CONFIG", info.problem);
  const preset = PRESETS[info.id];
  const baseUrl = (envString("AI_BASE_URL") ?? preset.baseUrl ?? "").replace(/\/+$/, "");
  return new OpenAICompatibleProvider({
    id: info.id,
    label: preset.label,
    baseUrl,
    apiKey: resolveApiKey(preset),
    defaultModel: info.defaultModel,
    tokenParam: preset.tokenParam,
    reasoningEffort: envString("AI_REASONING_EFFORT") ?? preset.reasoningEffort,
    timeoutMs: envInt("AI_TIMEOUT_MS", 50_000, 5_000, 300_000),
    maxRetries: envInt("AI_MAX_RETRIES", 1, 0, 3),
  });
}

/** Modelo a usar: el configurado en el panel > AI_MODEL > el modelo por defecto del proveedor. */
export function resolveModel(provider: ChatProvider, adminModel: string | null): string {
  return adminModel?.trim() || envString("AI_MODEL") || provider.defaultModel;
}
