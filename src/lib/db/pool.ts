import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";
import { ConfigError } from "@/lib/errors";
import { envInt, envString } from "@/lib/env";

declare global {
  var __aiExpertPool: Pool | undefined;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "db", "postgres"]);

/**
 * Construye la configuración del pool a partir de DATABASE_URL.
 * - Elimina parámetros propios de otras herramientas (sslmode, pgbouncer...) y decide SSL de forma explícita:
 *   DATABASE_SSL = auto (por defecto) | true | false.
 * - Con Supabase (host remoto) activa SSL; en local (Docker) no.
 */
export function buildPoolConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig {
  const raw = env.DATABASE_URL?.trim();
  if (!raw) {
    throw new ConfigError("Falta DATABASE_URL. Copia .env.example a .env y completa la conexión a PostgreSQL/Supabase.");
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError(
      "DATABASE_URL no es una URL válida. Si la contraseña tiene caracteres especiales (@ # / : ?) codifícalos (URL-encode).",
    );
  }
  const sslmode = url.searchParams.get("sslmode");
  for (const p of ["sslmode", "uselibpqcompat", "pgbouncer", "connection_limit", "pool_timeout", "schema"]) {
    url.searchParams.delete(p);
  }
  const mode = (env.DATABASE_SSL ?? "auto").trim().toLowerCase();
  const isLocal = LOCAL_HOSTS.has(url.hostname);
  const useSsl =
    mode === "true" || mode === "require" || (mode === "auto" && (!isLocal || (!!sslmode && sslmode !== "disable")));

  return {
    connectionString: url.toString(),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: envInt("DATABASE_POOL_MAX", 5, 1, 50),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  };
}

export function getPool(): Pool {
  if (!globalThis.__aiExpertPool) {
    const pool = new Pool(buildPoolConfig());
    pool.on("error", (err) => console.error("[db] error en conexión inactiva:", err.message));
    globalThis.__aiExpertPool = pool;
  }
  return globalThis.__aiExpertPool;
}

/** Ejecuta una consulta parametrizada y devuelve todas las filas. */
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(text, values);
  return result.rows;
}

/** Ejecuta una consulta y devuelve la primera fila (o null). */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, values);
  return rows[0] ?? null;
}

/** Ejecuta varias operaciones dentro de una transacción. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* la conexión pudo haberse perdido */
    }
    throw err;
  } finally {
    client.release();
  }
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

/** Escapa los comodines de LIKE/ILIKE en texto ingresado por el usuario. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}

export function databaseConfigured(): boolean {
  return Boolean(envString("DATABASE_URL"));
}
