// Aplica las migraciones SQL de db/migrations (en orden) y registra cuáles ya se ejecutaron.
//   npm run db:migrate
import fs from "node:fs";
import path from "node:path";
import { connect, loadEnv } from "./lib/db.mjs";

loadEnv();

const dir = path.resolve(process.cwd(), "db/migrations");
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let client;
try {
  client = await connect();
  await client.query(
    "create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())",
  );
  const { rows } = await client.query("select version from schema_migrations");
  const applied = new Set(rows.map((r) => r.version));

  let count = 0;
  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    if (applied.has(version)) {
      console.log(`  · ${version} (ya aplicada)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    process.stdout.write(`  → aplicando ${version} ... `);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into schema_migrations (version) values ($1) on conflict do nothing", [version]);
      await client.query("commit");
      console.log("ok");
      count++;
    } catch (err) {
      await client.query("rollback");
      console.log("ERROR");
      throw err;
    }
  }
  console.log(count ? `\n✔ ${count} migración(es) aplicada(s).` : "\n✔ La base de datos ya está al día.");
} catch (err) {
  console.error("\n✖ No se pudo migrar la base de datos:", err.message);
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN/.test(String(err.code ?? err.message))) {
    console.error("  Revisa DATABASE_URL y que la base de datos esté encendida (¿ejecutaste `npm run db:up`?).");
    console.error("  Con Supabase usa la cadena «Session pooler» si tu red no soporta IPv6.");
  }
  process.exitCode = 1;
} finally {
  await client?.end();
}
