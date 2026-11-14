// Crea (o actualiza) la cuenta ADMIN inicial y, opcionalmente, un usuario de demostración.
//   npm run db:seed
// La contraseña se lee de ADMIN_PASSWORD (variable de entorno): nunca va en el código ni en el repositorio.
import bcrypt from "bcryptjs";
import { connect, loadEnv } from "./lib/db.mjs";

loadEnv();

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function validate(label, email, password) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(`${label}: correo inválido («${email}»).`);
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    fail(`${label}: la contraseña debe tener entre 8 y 72 caracteres e incluir letras y números.`);
  }
}

const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD ?? "";
const adminName = (process.env.ADMIN_NAME ?? "Administrador").trim() || "Administrador";
if (!adminEmail || !adminPassword) {
  fail("Define ADMIN_EMAIL y ADMIN_PASSWORD en tu .env (puedes generarlos con `npm run env:init`).");
}
validate("ADMIN", adminEmail, adminPassword);

const client = await connect();
try {
  // --- ADMIN -----------------------------------------------------------------
  const existing = await client.query("select id from users where email = $1", [adminEmail]);
  if (existing.rowCount) {
    const resetPassword = String(process.env.ADMIN_RESET_PASSWORD ?? "").toLowerCase() === "true";
    if (resetPassword) {
      const hash = await bcrypt.hash(adminPassword, 11);
      await client.query(
        `update users set name = $2, role = 'ADMIN', is_active = true, password_hash = $3,
                token_version = token_version + 1, failed_logins = 0, locked_until = null, updated_at = now()
          where email = $1`,
        [adminEmail, adminName, hash],
      );
      console.log(`✔ Administrador ${adminEmail} actualizado (contraseña restablecida).`);
    } else {
      await client.query(
        "update users set name = $2, role = 'ADMIN', is_active = true, updated_at = now() where email = $1",
        [adminEmail, adminName],
      );
      console.log(`✔ Administrador ${adminEmail} ya existía (se conservó su contraseña; usa ADMIN_RESET_PASSWORD=true para cambiarla).`);
    }
  } else {
    const hash = await bcrypt.hash(adminPassword, 11);
    await client.query("insert into users (name, email, password_hash, role) values ($1, $2, $3, 'ADMIN')", [
      adminName,
      adminEmail,
      hash,
    ]);
    console.log(`✔ Administrador creado: ${adminEmail}`);
  }

  // --- Usuario de demostración (opcional) ----------------------------------------
  if (String(process.env.SEED_DEMO_USER ?? "").toLowerCase() === "true") {
    const demoEmail = (process.env.DEMO_EMAIL ?? "demo@example.com").trim().toLowerCase();
    const demoPassword = process.env.DEMO_PASSWORD ?? "";
    if (!demoPassword) fail("SEED_DEMO_USER=true requiere DEMO_PASSWORD.");
    validate("DEMO", demoEmail, demoPassword);
    const hash = await bcrypt.hash(demoPassword, 11);
    const res = await client.query(
      `insert into users (name, email, password_hash, role) values ('Usuario Demo', $1, $2, 'USER')
         on conflict (email) do nothing`,
      [demoEmail, hash],
    );
    console.log(res.rowCount ? `✔ Usuario demo creado: ${demoEmail}` : `✔ Usuario demo ${demoEmail} ya existía.`);
  }
} catch (err) {
  console.error("✖ No se pudo ejecutar el seed:", err.message);
  if (/relation "users" does not exist/.test(err.message)) {
    console.error("  Ejecuta primero `npm run db:migrate`.");
  }
  process.exitCode = 1;
} finally {
  await client.end();
}
