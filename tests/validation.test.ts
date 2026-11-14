import { describe, expect, it } from "vitest";
import {
  adminUpdateUserSchema,
  assistantSettingsSchema,
  changePasswordSchema,
  feedbackSchema,
  loginSchema,
  MAX_MESSAGE_CHARS,
  registerSchema,
  renameConversationSchema,
  sendMessageSchema,
} from "@/lib/validation";
import { getDefaultAssistant } from "@/lib/assistant/defaults";

const validUser = { name: "Ana Pérez", email: "Ana@Correo.COM ", password: "Clave2026ok" };

const DEFAULT_ASSISTANT = getDefaultAssistant();

describe("registro e inicio de sesión", () => {
  it("normaliza el correo (minúsculas, sin espacios) y el nombre", () => {
    const parsed = registerSchema.parse({ ...validUser, name: "  Ana Pérez  " });
    expect(parsed.email).toBe("ana@correo.com");
    expect(parsed.name).toBe("Ana Pérez");
  });

  it.each([
    ["corta", "ab1"],
    ["sin número", "SoloLetrasAqui"],
    ["sin letras", "123456789"],
    ["demasiado larga (límite de bcrypt)", `a1${"x".repeat(80)}`],
  ])("rechaza una contraseña %s", (_label, password) => {
    expect(registerSchema.safeParse({ ...validUser, password }).success).toBe(false);
  });

  it("rechaza correos inválidos y nombres demasiado cortos", () => {
    expect(registerSchema.safeParse({ ...validUser, email: "no-es-correo" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validUser, name: "A" }).success).toBe(false);
  });

  it("los mensajes de error están en español", () => {
    const result = registerSchema.safeParse({ ...validUser, password: "abc" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toMatch(/contraseña/i);
  });

  it("el rol no forma parte del registro público (se ignora cualquier valor enviado)", () => {
    const parsed = registerSchema.parse({ ...validUser, role: "ADMIN" });
    expect(parsed).not.toHaveProperty("role");
  });

  it("el login solo exige correo válido y contraseña no vacía", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("el cambio de contraseña valida la nueva con las mismas reglas", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "vieja", newPassword: "Nueva2026ok" }).success).toBe(true);
    expect(changePasswordSchema.safeParse({ currentPassword: "vieja", newPassword: "corta" }).success).toBe(false);
  });
});

describe("mensajes del chat", () => {
  it("acepta una pregunta normal", () => {
    expect(sendMessageSchema.safeParse({ content: "¿Qué es una API?" }).success).toBe(true);
  });

  it.each([["vacío", ""], ["solo espacios", "   \n  "]])("rechaza un mensaje %s", (_label, content) => {
    expect(sendMessageSchema.safeParse({ content }).success).toBe(false);
  });

  it(`rechaza más de ${MAX_MESSAGE_CHARS} caracteres y acepta exactamente el máximo`, () => {
    expect(sendMessageSchema.safeParse({ content: "x".repeat(MAX_MESSAGE_CHARS) }).success).toBe(true);
    expect(sendMessageSchema.safeParse({ content: "x".repeat(MAX_MESSAGE_CHARS + 1) }).success).toBe(false);
  });

  it("regenerate no necesita contenido, pero sin regenerate sí", () => {
    expect(sendMessageSchema.safeParse({ regenerate: true }).success).toBe(true);
    expect(sendMessageSchema.safeParse({}).success).toBe(false);
    expect(sendMessageSchema.safeParse({ regenerate: false }).success).toBe(false);
  });

  it("el título de una conversación no puede estar vacío ni exceder 120 caracteres", () => {
    expect(renameConversationSchema.parse({ title: "  Mi título  " }).title).toBe("Mi título");
    expect(renameConversationSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(renameConversationSchema.safeParse({ title: "x".repeat(121) }).success).toBe(false);
  });

  it("la valoración solo admite 1, -1 o 0", () => {
    for (const value of [1, -1, 0]) expect(feedbackSchema.safeParse({ value }).success).toBe(true);
    for (const value of [2, "1", null, 0.5]) expect(feedbackSchema.safeParse({ value }).success).toBe(false);
  });
});

describe("administración", () => {
  it("adminUpdateUser exige al menos un cambio y solo roles válidos", () => {
    expect(adminUpdateUserSchema.safeParse({}).success).toBe(false);
    expect(adminUpdateUserSchema.safeParse({ role: "ADMIN" }).success).toBe(true);
    expect(adminUpdateUserSchema.safeParse({ role: "ROOT" }).success).toBe(false);
    expect(adminUpdateUserSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("la configuración por defecto del asistente es válida", () => {
    const parsed = assistantSettingsSchema.safeParse({ ...DEFAULT_ASSISTANT, suggestedQuestions: [...DEFAULT_ASSISTANT.suggestedQuestions] });
    expect(parsed.success).toBe(true);
  });

  it("el System Prompt tiene longitud mínima y máxima", () => {
    const base = { ...DEFAULT_ASSISTANT, suggestedQuestions: [...DEFAULT_ASSISTANT.suggestedQuestions] };
    expect(assistantSettingsSchema.safeParse({ ...base, systemPrompt: "corto" }).success).toBe(false);
    expect(assistantSettingsSchema.safeParse({ ...base, systemPrompt: "x".repeat(12_001) }).success).toBe(false);
  });

  it.each([
    ["temperatura > 2", { temperature: 2.5 }],
    ["temperatura < 0", { temperature: -0.1 }],
    ["maxTokens < 64", { maxTokens: 10 }],
    ["maxTokens > 8192", { maxTokens: 9_000 }],
    ["maxTokens no entero", { maxTokens: 100.5 }],
    ["contextMessages < 2", { contextMessages: 1 }],
    ["contextMessages > 50", { contextMessages: 51 }],
    ["más de 6 preguntas sugeridas", { suggestedQuestions: ["uno uno", "dos dos", "tres", "cuatro", "cinco", "seis seis", "siete"] }],
  ])("rechaza %s", (_label, patch) => {
    const base = { ...DEFAULT_ASSISTANT, suggestedQuestions: [...DEFAULT_ASSISTANT.suggestedQuestions] };
    expect(assistantSettingsSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  });

  it("el modelo vacío se guarda como null (usar el predeterminado)", () => {
    const base = { ...DEFAULT_ASSISTANT, suggestedQuestions: [...DEFAULT_ASSISTANT.suggestedQuestions] };
    expect(assistantSettingsSchema.parse({ ...base, model: "   " }).model).toBeNull();
    expect(assistantSettingsSchema.parse({ ...base, model: "gpt-5-mini" }).model).toBe("gpt-5-mini");
  });
});
