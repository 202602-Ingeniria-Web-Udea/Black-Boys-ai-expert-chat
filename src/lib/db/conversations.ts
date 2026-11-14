import { escapeLike, query, queryOne } from "./pool";

export interface ConversationRecord {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationListItem {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

const COLS = `id, user_id AS "userId", title, created_at AS "createdAt", updated_at AS "updatedAt"`;

/** Lista SOLO las conversaciones del usuario indicado (más recientes primero). */
export function listConversations(userId: string, search?: string) {
  const pattern = search ? `%${escapeLike(search)}%` : null;
  return query<ConversationListItem>(
    `SELECT c.id, c.title, c.created_at AS "createdAt", c.updated_at AS "updatedAt",
            (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id)::int AS "messageCount"
       FROM conversations c
      WHERE c.user_id = $1
        AND ($2::text IS NULL
             OR c.title ILIKE $2
             OR EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.content ILIKE $2))
      ORDER BY c.updated_at DESC
      LIMIT 200`,
    [userId, pattern],
  );
}

export async function createConversation(userId: string, title = "Nueva conversación") {
  const rows = await query<ConversationRecord>(
    `INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING ${COLS}`,
    [userId, title],
  );
  return rows[0];
}

/** Devuelve la conversación solo si pertenece al usuario (control de propiedad). */
export function getOwnedConversation(userId: string, id: string) {
  return queryOne<ConversationRecord>(`SELECT ${COLS} FROM conversations WHERE id = $1 AND user_id = $2`, [id, userId]);
}

export function renameConversation(userId: string, id: string, title: string) {
  return queryOne<ConversationRecord>(
    `UPDATE conversations SET title = $3, updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING ${COLS}`,
    [id, userId, title],
  );
}

/** Cambia el título sin tocar updated_at (títulos automáticos). */
export async function setConversationTitle(id: string, title: string) {
  await query(`UPDATE conversations SET title = $2 WHERE id = $1`, [id, title]);
}

export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id`, [id, userId]);
  return rows.length > 0;
}
