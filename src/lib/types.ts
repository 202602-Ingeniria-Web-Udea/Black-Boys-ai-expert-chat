// Tipos compartidos entre servidor y cliente (las fechas viajan como strings ISO).

export type Role = "ADMIN" | "USER";
export type MessageRole = "USER" | "ASSISTANT";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface PublicAssistant {
  name: string;
  specialty: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  model: string | null;
  latencyMs: number | null;
  feedback: 1 | -1 | null;
  createdAt: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
