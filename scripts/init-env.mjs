// Genera un archivo .env listo para desarrollo local a partir de .env.example,
// creando un AUTH_SECRET aleatorio y una contraseña de administrador aleatoria.
//   npm run env:init            → crea .env si no existe
//   npm run env:init -- --force → lo sobrescribe
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const example = path.join(root, ".env.example");
const target = path.join(root, ".env");
const force = process.argv.includes("--force");

if (!fs.existsSync(example)) {
  console.error("✖ No se encontró .env.example. Ejecuta este comando desde la raíz del proyecto.");
  process.exit(1);
}
if (fs.existsSync(target) && !force) {
  console.log("• Ya existe un archivo .env; no se modificó. Usa `npm run env:init -- --force` para regenerarlo.");
  process.exit(0);
}

function randomPassword(length = 14) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  while (out.length < length) out += alphabet[crypto.randomInt(alphabet.length)];
  // Garantiza al menos una letra y un número (política de contraseñas de la app).
  return out.slice(0, length - 2) + "7" + "k";
}

const authSecret = crypto.randomBytes(48).toString("base64url");
const adminPassword = randomPassword();
const demoPassword = randomPassword();

let content = fs.readFileSync(example, "utf8");
content = content
  .replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET=${authSecret}`)
  .replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${adminPassword}`)
  .replace(/^DEMO_PASSWORD=.*$/m, `DEMO_PASSWORD=${demoPassword}`)
  .replace(/^SEED_DEMO_USER=.*$/m, "SEED_DEMO_USER=true");
fs.writeFileSync(target, content, { mode: 0o600 });

console.log("✔ Archivo .env creado.\n");
console.log("  Cuenta ADMIN  →  admin@example.com  /  " + adminPassword);
console.log("  Usuario demo  →  demo@example.com   /  " + demoPassword);
console.log("\n  Guarda estas credenciales: solo se muestran ahora (están también en tu .env).");
console.log("  Siguiente paso: npm run db:up && npm run db:setup && npm run dev");
