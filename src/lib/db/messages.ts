import type { MessageRole } from "@/lib/types";
import { query, queryOne } from "./pool";

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  model: string | null;
  latencyMs: number | null;
  feedback: 1 | -1 | null;
  createdAt: Date;
}

const COLS = `id, conversation_id AS "conversationId", role, content, model, latency_ms AS "latencyMs", feedback, created_at AS "createdAt"`;

export function listMessages(conversationId: string) {
  return query<MessageRecord>(`SELECT ${COLS} FROM messages WHERE conversation_id = $1 ORDER BY seq ASC`, [conversationId]);
}

/** Los últimos `limit` mensajes en orden cronológico (contexto conversacional). */
export function recentMessages(conversationId: string, limit: number) {
  return query<MessageRecord>(
    `SELECT * FROM (
        SELECT ${COLS}, seq FROM messages WHERE conversation_id = $1 ORDER BY seq DESC LIMIT $2
     ) t ORDER BY seq ASC`,
    [conversationId, limit],
  );
}

export function getLastMessage(conversationId: string) {
  return queryOne<MessageRecord>(`SELECT ${COLS} FROM messages WHERE conversation_id = $1 ORDER BY seq DESC LIMIT 1`, [
    conversationId,
  ]);
}

/** Inserta un mensaje y actualiza la fecha de la conversación en una sola sentencia atómica. */
export async function insertMessage(input: {
  conversationId: string;
  role: MessageRole;
  content: string;
  model?: string | null;
  latencyMs?: number | null;
}) {
  const rows = await query<MessageRecord>(
    `WITH ins AS (
        INSERT INTO messages (conversation_id, role, content, model, latency_ms)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${COLS}
     ), touch AS (
        UPDATE conversations SET updated_at = now() WHERE id = $1
     )
     SELECT * FROM ins`,
    [input.conversationId, input.role, input.content, input.model ?? null, input.latencyMs ?? null],
  );
  return rows[0];
}

export async function deleteMessage(id: string) {
  await query(`DELETE FROM messages WHERE id = $1`, [id]);
}

/** Guarda 👍/👎 solo si el mensaje (del asistente) pertenece a una conversación del usuario. */
export function setFeedback(userId: string, messageId: string, value: 1 | -1 | null) {
  return queryOne<MessageRecord>(
    `UPDATE messages m SET feedback = $3
       FROM conversations c
      WHERE m.id = $2 AND m.conversation_id = c.id AND c.user_id = $1 AND m.role = 'ASSISTANT'
  RETURNING m.id, m.conversation_id AS "conversationId", m.role, m.content, m.model,
            m.latency_ms AS "latencyMs", m.feedback, m.created_at AS "createdAt"`,
    [userId, messageId, value],
  );
}

/** Mensajes que el usuario envió en los últimos `seconds` segundos (límite de ritmo). */
export async function countRecentUserMessages(userId: string, seconds: number): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n
       FROM messages m JOIN conversations c ON c.id = m.conversation_id
      WHERE c.user_id = $1 AND m.role = 'USER' AND m.created_at > now() - make_interval(secs => $2)`,
    [userId, seconds],
  );
  return row?.n ?? 0;
}
