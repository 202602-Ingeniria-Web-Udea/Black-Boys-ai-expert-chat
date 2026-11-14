import { getDefaultAssistant } from "@/lib/assistant/defaults";
import type { PublicAssistant } from "@/lib/types";
import { query, queryOne } from "./pool";

export interface AssistantSettings {
  name: string;
  specialty: string;
  systemPrompt: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  model: string | null;
  temperature: number;
  maxTokens: number;
  contextMessages: number;
  updatedAt: Date;
}

export type AssistantSettingsInput = Omit<AssistantSettings, "updatedAt">;

const COLS = `name, specialty, system_prompt AS "systemPrompt", welcome_message AS "welcomeMessage",
  suggested_questions AS "suggestedQuestions", model, temperature::float8 AS temperature,
  max_tokens AS "maxTokens", context_messages AS "contextMessages", updated_at AS "updatedAt"`;

const UPSERT = `INSERT INTO assistant_settings
    (id, name, specialty, system_prompt, welcome_message, suggested_questions, model, temperature, max_tokens, context_messages, updated_by)
  VALUES (1, $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, specialty = EXCLUDED.specialty, system_prompt = EXCLUDED.system_prompt,
    welcome_message = EXCLUDED.welcome_message, suggested_questions = EXCLUDED.suggested_questions,
    model = EXCLUDED.model, temperature = EXCLUDED.temperature, max_tokens = EXCLUDED.max_tokens,
    context_messages = EXCLUDED.context_messages, updated_by = EXCLUDED.updated_by, updated_at = now()
  RETURNING ${COLS}`;

function toParams(s: AssistantSettingsInput, userId: string | null) {
  return [
    s.name,
    s.specialty,
    s.systemPrompt,
    s.welcomeMessage,
    JSON.stringify(s.suggestedQuestions),
    s.model,
    s.temperature,
    s.maxTokens,
    s.contextMessages,
    userId,
  ];
}

/** Valores por defecto: salen de la plantilla de especialidad activa (variable ASSISTANT_PRESET). */
export function defaultSettings(): AssistantSettingsInput {
  return getDefaultAssistant();
}

/** Lee la configuración; si aún no existe la crea con los valores por defecto. */
export async function getAssistantSettings(): Promise<AssistantSettings> {
  const existing = await queryOne<AssistantSettings>(`SELECT ${COLS} FROM assistant_settings WHERE id = 1`);
  if (existing) return existing;
  await query(
    `INSERT INTO assistant_settings
       (id, name, specialty, system_prompt, welcome_message, suggested_questions, model, temperature, max_tokens, context_messages)
     VALUES (1, $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
     ON CONFLICT (id) DO NOTHING`,
    toParams(defaultSettings(), null).slice(0, 9),
  );
  const created = await queryOne<AssistantSettings>(`SELECT ${COLS} FROM assistant_settings WHERE id = 1`);
  if (!created) throw new Error("No se pudo inicializar assistant_settings");
  return created;
}

/** Variante tolerante para páginas públicas: si la BD no responde usa los valores por defecto. */
export async function getAssistantSettingsSafe(): Promise<AssistantSettingsInput> {
  try {
    return await getAssistantSettings();
  } catch {
    return defaultSettings();
  }
}

export async function saveAssistantSettings(input: AssistantSettingsInput, userId: string): Promise<AssistantSettings> {
  const rows = await query<AssistantSettings>(UPSERT, toParams(input, userId));
  return rows[0];
}

export function resetAssistantSettings(userId: string): Promise<AssistantSettings> {
  return saveAssistantSettings(defaultSettings(), userId);
}

export function toPublicAssistant(s: Pick<AssistantSettings, "name" | "specialty" | "welcomeMessage" | "suggestedQuestions">): PublicAssistant {
  return {
    name: s.name,
    specialty: s.specialty,
    welcomeMessage: s.welcomeMessage,
    suggestedQuestions: s.suggestedQuestions,
  };
}
