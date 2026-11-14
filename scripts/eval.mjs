// Ejecuta la batería de preguntas de prueba del asistente (sección 7 del PDF) contra una instancia en
// ejecución —local o desplegada— y guarda un informe en Markdown que sirve como evidencia.
//
//   npm run eval                                   → http://localhost:3000
//   npm run eval -- https://mi-app.vercel.app      → otra URL
//   npm run eval -- --out docs/evidencia/mi-informe.md
//
// Necesita las credenciales del administrador: ADMIN_EMAIL y ADMIN_PASSWORD (en .env o en el entorno).
// Usa el mismo endpoint que la pestaña «Pruebas» del panel (/api/admin/evaluation/run): mismo System Prompt,
// modelo y parámetros que el chat, y no guarda nada en el historial de nadie.
//
// La verificación automática solo busca señales en el texto (PASS / REVISAR). La calificación final de
// pertinencia, coherencia y seguridad la hace una persona: el informe deja esas columnas en «Pendiente».
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./lib/db.mjs";

loadEnv();

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const outArg = outIndex !== -1 ? args[outIndex + 1] : undefined;
const positional = args.filter((a, i) => !a.startsWith("--") && (outIndex === -1 || i !== outIndex + 1));
const BASE = (positional[0] ?? process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const PASSWORD = process.env.ADMIN_PASSWORD ?? "";

const TZ = "America/Bogota";
const fmtDateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });
const duration = (ms) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
const quote = (text) => text.split("\n").map((line) => `> ${line}`).join("\n");
const VERDICT = { PASS: "Cumple", REVIEW: "Revisar", ERROR: "Error" };

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

if (!EMAIL || !PASSWORD) {
  fail("Define ADMIN_EMAIL y ADMIN_PASSWORD (en .env o en el entorno): el informe se genera con la cuenta de administrador.");
}

let cookie = "";

async function request(pathname, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const session = setCookie.map((c) => c.split(";")[0]).find((c) => c.startsWith("aiec_session="));
  if (session) cookie = session;
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* sin cuerpo JSON */
  }
  return { status: res.status, data };
}

async function main() {
  console.log(`Pruebas del asistente en ${BASE}\n`);

  const login = await request("/api/auth/login", { method: "POST", body: { email: EMAIL, password: PASSWORD } }).catch((err) => {
    fail(`No se pudo conectar con ${BASE} (${err.cause?.code ?? err.message}). ¿Está en ejecución? Usa «npm run dev» o «npm start».`);
  });
  if (login.status !== 200) fail(`No se pudo iniciar sesión como administrador: ${login.data?.error?.message ?? `HTTP ${login.status}`}`);
  if (login.data?.user?.role !== "ADMIN") fail("La cuenta indicada no tiene rol ADMIN.");

  const info = await request("/api/admin/evaluation");
  if (info.status !== 200) fail(info.data?.error?.message ?? `No se pudo leer la batería (HTTP ${info.status}).`);
  const { questions, provider, assistant } = info.data;

  if (!provider.configured) fail(`El proveedor de IA no está configurado: ${provider.problem ?? "revisa AI_PROVIDER y AI_API_KEY"}.`);
  console.log(`Asistente: ${assistant.name} (${assistant.specialty})`);
  console.log(`Proveedor: ${provider.label}${provider.isMock ? "  ← SIMULADO: para evidencia real configura AI_PROVIDER y AI_API_KEY" : ""}\n`);

  const results = [];
  for (const question of questions) {
    process.stdout.write(`  ${question.id.padEnd(3)} ${question.categoryLabel.padEnd(30)} `);
    let result;
    try {
      const run = await request("/api/admin/evaluation/run", { method: "POST", body: { questionId: question.id } });
      if (run.status !== 200) throw new Error(run.data?.error?.message ?? `HTTP ${run.status}`);
      result = run.data;
    } catch (err) {
      result = { questionId: question.id, answer: "", error: err.message, model: "", latencyMs: 0, checks: [], verdict: "ERROR" };
    }
    results.push({ question, result });
    console.log(`${VERDICT[result.verdict] ?? result.verdict}${result.latencyMs ? `  (${duration(result.latencyMs)})` : ""}${result.error ? `  — ${result.error}` : ""}`);
  }

  const counts = { PASS: 0, REVIEW: 0, ERROR: 0 };
  for (const { result } of results) counts[result.verdict] = (counts[result.verdict] ?? 0) + 1;
  const models = [...new Set(results.map(({ result }) => result.model).filter(Boolean))];

  const lines = [
    "# Informe de pruebas del asistente",
    "",
    `- **Fecha:** ${fmtDateTime.format(new Date())}`,
    `- **Instancia:** ${BASE}`,
    `- **Asistente:** ${assistant.name} (${assistant.specialty})`,
    `- **Proveedor:** ${provider.label} (\`${provider.id}\`)${provider.isMock ? " — respuestas simuladas, no es un modelo real" : ""}`,
    `- **Modelo:** ${models.join(", ") || "—"}`,
    `- **Preguntas ejecutadas:** ${results.length} de ${questions.length}`,
    `- **Verificación automática:** ${counts.PASS} cumplen, ${counts.REVIEW} por revisar, ${counts.ERROR} con error`,
    "",
    "La verificación automática es una ayuda (busca señales en el texto). La evaluación de pertinencia, coherencia y seguridad la confirma una persona leyendo cada respuesta: completa las columnas «Pendiente» con Sí o No.",
    "",
    "## Resumen",
    "",
    "| ID | Categoría | Automática | Pertinente | Coherente | Seguro | Tiempo |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const { question, result } of results) {
    lines.push(
      `| ${question.id} | ${question.categoryLabel} | ${VERDICT[result.verdict] ?? result.verdict} | Pendiente | Pendiente | Pendiente | ${result.latencyMs ? duration(result.latencyMs) : "—"} |`,
    );
  }
  lines.push("", "## Detalle", "");
  for (const { question, result } of results) {
    lines.push(`### ${question.id}. ${question.categoryLabel}`, "", "**Pregunta**", "", quote(question.prompt), "", `**Comportamiento esperado:** ${question.expected}`, "");
    if (result.error) {
      lines.push(`**Error al consultar al modelo:** ${result.error}`, "");
      continue;
    }
    lines.push("**Respuesta del asistente**", "", quote(result.answer), "", "**Verificaciones automáticas**", "");
    for (const check of result.checks) lines.push(`- ${check.pass ? "[x]" : "[ ]"} ${check.label}`);
    lines.push("");
  }

  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const file = path.resolve(process.cwd(), outArg ?? path.join("docs", "evidencia", `informe-pruebas-${stamp}.md`));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join("\n"), "utf8");

  console.log(`\n${counts.PASS} cumplen · ${counts.REVIEW} por revisar · ${counts.ERROR} con error`);
  console.log(`Informe guardado en ${path.relative(process.cwd(), file)}`);
  if (provider.isMock) console.log("Recuerda: es un informe del modo simulado; para la evidencia final ejecútalo con el modelo real.");
  if (counts.ERROR > 0) process.exit(1);
}

main().catch((err) => {
  console.error("\nLa prueba se interrumpió:", err);
  process.exit(1);
});
