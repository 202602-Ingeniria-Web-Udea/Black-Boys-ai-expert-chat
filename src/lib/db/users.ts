import { HttpError } from "@/lib/errors";
import type { Role } from "@/lib/types";
import { query, queryOne, withTransaction } from "./pool";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  tokenVersion: number;
  failedLogins: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  conversationCount: number;
  messageCount: number;
}

const COLS = `id, name, email, password_hash AS "passwordHash", role, is_active AS "isActive",
  token_version AS "tokenVersion", failed_logins AS "failedLogins", locked_until AS "lockedUntil",
  last_login_at AS "lastLoginAt", created_at AS "createdAt"`;

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

export function findUserByEmail(email: string) {
  return queryOne<UserRecord>(`SELECT ${COLS} FROM users WHERE email = $1`, [email]);
}

export function findUserById(id: string) {
  return queryOne<UserRecord>(`SELECT ${COLS} FROM users WHERE id = $1`, [id]);
}

export async function createUser(input: { name: string; email: string; passwordHash: string; role?: Role }) {
  const rows = await query<UserRecord>(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING ${COLS}`,
    [input.name, input.email, input.passwordHash, input.role ?? "USER"],
  );
  return rows[0];
}

/** Suma un intento fallido y bloquea la cuenta temporalmente al llegar al máximo. */
export async function recordLoginFailure(id: string) {
  return queryOne<{ failedLogins: number; lockedUntil: Date | null }>(
    `UPDATE users
        SET failed_logins = CASE WHEN failed_logins + 1 >= $2 THEN 0 ELSE failed_logins + 1 END,
            locked_until  = CASE WHEN failed_logins + 1 >= $2 THEN now() + make_interval(mins => $3) ELSE locked_until END,
            updated_at    = now()
      WHERE id = $1
  RETURNING failed_logins AS "failedLogins", locked_until AS "lockedUntil"`,
    [id, MAX_FAILED_LOGINS, LOCK_MINUTES],
  );
}

export async function recordLoginSuccess(id: string) {
  await query(`UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = now() WHERE id = $1`, [id]);
}

export async function updateUserName(id: string, name: string) {
  return queryOne<UserRecord>(`UPDATE users SET name = $2, updated_at = now() WHERE id = $1 RETURNING ${COLS}`, [id, name]);
}

/** Cambia la contraseña e invalida todas las sesiones anteriores (token_version + 1). */
export async function updateUserPassword(id: string, passwordHash: string) {
  return queryOne<UserRecord>(
    `UPDATE users SET password_hash = $2, token_version = token_version + 1, failed_logins = 0,
            locked_until = NULL, updated_at = now()
      WHERE id = $1 RETURNING ${COLS}`,
    [id, passwordHash],
  );
}

// --------------------------------------------------------------------------- administración

export function listUsersAdmin(opts: { search?: string; limit?: number; offset?: number } = {}) {
  const pattern = opts.search ? `%${opts.search.replace(/[\\%_]/g, "\\$&")}%` : null;
  return query<AdminUserRow>(
    `SELECT u.id, u.name, u.email, u.role, u.is_active AS "isActive",
            u.last_login_at AS "lastLoginAt", u.created_at AS "createdAt",
            (SELECT count(*) FROM conversations c WHERE c.user_id = u.id)::int AS "conversationCount",
            (SELECT count(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id
              WHERE c.user_id = u.id AND m.role = 'USER')::int AS "messageCount"
       FROM users u
      WHERE ($1::text IS NULL OR u.name ILIKE $1 OR u.email ILIKE $1)
      ORDER BY u.created_at DESC
      LIMIT $2 OFFSET $3`,
    [pattern, opts.limit ?? 200, opts.offset ?? 0],
  );
}

/** Cambia rol / estado / nombre protegiendo que siempre quede un ADMIN activo. */
export async function adminUpdateUser(
  id: string,
  patch: { role?: Role; isActive?: boolean; name?: string },
  actingUserId: string,
) {
  return withTransaction(async (client) => {
    const found = await client.query<UserRecord>(`SELECT ${COLS} FROM users WHERE id = $1 FOR UPDATE`, [id]);
    const current = found.rows[0];
    if (!current) return null;

    const nextRole = patch.role ?? current.role;
    const nextActive = patch.isActive ?? current.isActive;

    if (id === actingUserId && (nextRole !== current.role || nextActive !== current.isActive)) {
      throw new HttpError(409, "SELF_CHANGE", "No puedes cambiar tu propio rol ni desactivar tu propia cuenta.");
    }
    const losesAdmin = current.role === "ADMIN" && current.isActive && (nextRole !== "ADMIN" || !nextActive);
    if (losesAdmin) {
      const others = await client.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM users WHERE role = 'ADMIN' AND is_active AND id <> $1`,
        [id],
      );
      if (others.rows[0].n === 0) {
        throw new HttpError(409, "LAST_ADMIN", "Debe existir al menos un administrador activo.");
      }
    }
    // Un cambio de rol o de estado cierra las sesiones abiertas de ese usuario.
    const bump = nextRole !== current.role || nextActive !== current.isActive ? 1 : 0;
    const updated = await client.query<AdminUserRow>(
      `UPDATE users
          SET name = $2, role = $3, is_active = $4, token_version = token_version + $5, updated_at = now()
        WHERE id = $1
    RETURNING id, name, email, role, is_active AS "isActive", last_login_at AS "lastLoginAt",
              created_at AS "createdAt", 0 AS "conversationCount", 0 AS "messageCount"`,
      [id, patch.name ?? current.name, nextRole, nextActive, bump],
    );
    return updated.rows[0];
  });
}

export async function adminDeleteUser(id: string, actingUserId: string): Promise<boolean> {
  if (id === actingUserId) {
    throw new HttpError(409, "SELF_DELETE", "No puedes eliminar tu propia cuenta desde el panel.");
  }
  return withTransaction(async (client) => {
    const found = await client.query<UserRecord>(`SELECT ${COLS} FROM users WHERE id = $1 FOR UPDATE`, [id]);
    const current = found.rows[0];
    if (!current) return false;
    if (current.role === "ADMIN" && current.isActive) {
      const others = await client.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM users WHERE role = 'ADMIN' AND is_active AND id <> $1`,
        [id],
      );
      if (others.rows[0].n === 0) {
        throw new HttpError(409, "LAST_ADMIN", "No puedes eliminar al único administrador activo.");
      }
    }
    const res = await client.query(`DELETE FROM users WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  });
}
