import { z } from "zod";

// Mensajes de validación de Zod en español.
z.config(z.locales.es());

export const emailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.email("Ingresa un correo válido").max(160, "El correo es demasiado largo"));

export const nameSchema = z
  .string()
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(80, "El nombre no puede superar 80 caracteres");

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña no puede superar 72 caracteres")
  .regex(/[A-Za-z]/, "La contraseña debe incluir al menos una letra")
  .regex(/\d/, "La contraseña debe incluir al menos un número");

export const roleSchema = z.enum(["ADMIN", "USER"]);

export const registerSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresa tu contraseña").max(200),
});

export const updateProfileSchema = z.object({ name: nameSchema });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Ingresa tu contraseña actual").max(200),
  newPassword: passwordSchema,
});

export const idSchema = z.uuid("Identificador inválido");

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export const renameConversationSchema = z.object({
  title: z.string().trim().min(1, "El título no puede estar vacío").max(120, "El título no puede superar 120 caracteres"),
});

export const MAX_MESSAGE_CHARS = 4000;

export const sendMessageSchema = z
  .object({
    content: z
      .string()
      .max(MAX_MESSAGE_CHARS, `El mensaje no puede superar ${MAX_MESSAGE_CHARS} caracteres`)
      .refine((s) => s.trim().length > 0, "Escribe un mensaje")
      .optional(),
    regenerate: z.boolean().optional(),
  })
  .refine((v) => v.regenerate === true || v.content !== undefined, { message: "Escribe un mensaje" });

export const feedbackSchema = z.object({ value: z.union([z.literal(1), z.literal(-1), z.literal(0)]) });

export const adminCreateUserSchema = registerSchema.extend({ role: roleSchema.default("USER") });

export const adminUpdateUserSchema = z
  .object({ role: roleSchema.optional(), isActive: z.boolean().optional(), name: nameSchema.optional() })
  .refine((v) => Object.keys(v).length > 0, { message: "No hay cambios para guardar" });

export const assistantSettingsSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(60, "Máximo 60 caracteres"),
  specialty: z.string().trim().min(2, "La especialidad es obligatoria").max(60, "Máximo 60 caracteres"),
  systemPrompt: z
    .string()
    .trim()
    .min(100, "El System Prompt debe tener al menos 100 caracteres")
    .max(12000, "El System Prompt no puede superar 12.000 caracteres"),
  welcomeMessage: z.string().trim().min(5, "Escribe un mensaje de bienvenida").max(600, "Máximo 600 caracteres"),
  suggestedQuestions: z
    .array(z.string().trim().min(3, "Cada pregunta debe tener al menos 3 caracteres").max(140, "Máximo 140 caracteres por pregunta"))
    .max(6, "Máximo 6 preguntas sugeridas"),
  model: z
    .string()
    .trim()
    .max(100, "Máximo 100 caracteres")
    .nullish()
    .transform((v) => (v ? v : null)),
  temperature: z.number().min(0, "Mínimo 0").max(2, "Máximo 2"),
  maxTokens: z.number().int("Debe ser un entero").min(64, "Mínimo 64").max(8192, "Máximo 8192"),
  contextMessages: z.number().int("Debe ser un entero").min(2, "Mínimo 2").max(50, "Máximo 50"),
});

export const evaluationRunSchema = z.object({ questionId: z.string().min(1).max(40) });
