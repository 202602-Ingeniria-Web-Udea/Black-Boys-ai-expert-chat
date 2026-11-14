import { envString } from "@/lib/env";
import { query, queryOne } from "./pool";

export interface Overview {
  totalUsers: number;
  admins: number;
  activeUsers: number;
  newUsers7d: number;
  totalConversations: number;
  userMessages: number;
  assistantMessages: number;
  messages24h: number;
  avgLatencyMs: number;
  thumbsUp: number;
  thumbsDown: number;
}

export interface DailyPoint {
  day: string; // YYYY-MM-DD
  count: number;
}

export interface TopUser {
  id: string;
  name: string;
  email: string;
  messages: number;
}

export interface AdminStats {
  overview: Overview;
  daily: DailyPoint[];
  topUsers: TopUser[];
  timezone: string;
}

/** Estadísticas generales (solo agregados: el ADMIN nunca ve el contenido de las conversaciones). */
export async function getAdminStats(days = 14): Promise<AdminStats> {
  const timezone = envString("STATS_TIMEZONE") ?? "America/Bogota";

  const [overview, daily, topUsers] = await Promise.all([
    queryOne<Overview>(`
      SELECT
        (SELECT count(*) FROM users)::int                                                   AS "totalUsers",
        (SELECT count(*) FROM users WHERE role = 'ADMIN')::int                              AS "admins",
        (SELECT count(*) FROM users WHERE is_active)::int                                   AS "activeUsers",
        (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days')::int      AS "newUsers7d",
        (SELECT count(*) FROM conversations)::int                                           AS "totalConversations",
        (SELECT count(*) FROM messages WHERE role = 'USER')::int                            AS "userMessages",
        (SELECT count(*) FROM messages WHERE role = 'ASSISTANT')::int                       AS "assistantMessages",
        (SELECT count(*) FROM messages WHERE created_at > now() - interval '24 hours')::int AS "messages24h",
        (SELECT coalesce(round(avg(latency_ms)), 0) FROM messages
          WHERE role = 'ASSISTANT' AND latency_ms IS NOT NULL)::int                         AS "avgLatencyMs",
        (SELECT count(*) FROM messages WHERE feedback = 1)::int                             AS "thumbsUp",
        (SELECT count(*) FROM messages WHERE feedback = -1)::int                            AS "thumbsDown"
    `),
    query<DailyPoint>(
      `SELECT to_char(d.day, 'YYYY-MM-DD') AS day, coalesce(m.n, 0)::int AS count
         FROM generate_series(
                ((now() AT TIME ZONE $1)::date - ($2::int - 1))::timestamp,
                (now() AT TIME ZONE $1)::date::timestamp,
                interval '1 day') AS d(day)
         LEFT JOIN (
                SELECT (created_at AT TIME ZONE $1)::date AS day, count(*) AS n
                  FROM messages
                 WHERE role = 'USER' AND created_at > now() - make_interval(days => $2::int + 1)
                 GROUP BY 1) m ON m.day = d.day::date
        ORDER BY d.day`,
      [timezone, days],
    ),
    query<TopUser>(
      `SELECT u.id, u.name, u.email, count(m.id)::int AS messages
         FROM users u
         JOIN conversations c ON c.user_id = u.id
         JOIN messages m ON m.conversation_id = c.id AND m.role = 'USER'
        GROUP BY u.id
        ORDER BY messages DESC, u.name
        LIMIT 5`,
    ),
  ]);

  return { overview: overview as Overview, daily, topUsers, timezone };
}
