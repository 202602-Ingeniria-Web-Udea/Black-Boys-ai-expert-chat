// Utilidades compartidas por los scripts de base de datos (migrate, seed).
// Replica la lógica de conexión de src/lib/db/pool.ts para que ambos se comporten igual.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

/** Carga .env.local y .env (sin sobrescribir variables ya definidas), igual que Next.js. */
export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else {
        value = value.replace(/\s+#.*$/, "");
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    }
  }
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "db", "postgres"]);

export function poolConfig() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("Falta DATABASE_URL. Copia .env.example a .env (o ejecuta `npm run env:init`) y complétalo.");
  }
  const url = new URL(raw);
  const sslmode = url.searchParams.get("sslmode");
  for (const p of ["sslmode", "uselibpqcompat", "pgbouncer", "connection_limit", "pool_timeout", "schema"]) {
    url.searchParams.delete(p);
  }
  const mode = (process.env.DATABASE_SSL ?? "auto").toLowerCase();
  const isLocal = LOCAL_HOSTS.has(url.hostname);
  const useSsl =
    mode === "true" || mode === "require" || (mode === "auto" && (!isLocal || (sslmode && sslmode !== "disable")));
  return {
    connectionString: url.toString(),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 15000,
  };
}

export async function connect() {
  const client = new pg.Client(poolConfig());
  await client.connect();
  return client;
}
