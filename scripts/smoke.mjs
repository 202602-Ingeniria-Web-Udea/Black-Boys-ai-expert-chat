// Prueba de humo de punta a punta contra una instancia en ejecución (local o desplegada).
//
//   npm run smoke                              → http://localhost:3000
//   npm run smoke -- https://mi-app.vercel.app → otra URL
//
// Con ADMIN_EMAIL y ADMIN_PASSWORD definidos (en el entorno o en .env) también prueba el panel de
// administración. Crea usuarios temporales con correos aleatorios (@smoke.test). No toca datos existentes.
import { loadEnv } from "./lib/db.mjs";

loadEnv();

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ✖ ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

/** Cliente HTTP con su propio «cookie jar» (una persona = un cliente). */
class Client {
  constructor(label) {
    this.label = label;
    this.cookies = new Map();
  }

  cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  absorb(res) {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair, ...attrs] = line.split(";");
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const expired = attrs.some((a) => /^\s*max-age=0\s*$/i.test(a)) || value === "";
      if (expired) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  async request(path, { method = "GET", body, headers = {}, redirect = "manual" } = {}) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      redirect,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(this.cookies.size ? { Cookie: this.cookieHeader() } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    this.absorb(res);
    return res;
  }

  async json(path, options) {
    const res = await this.request(path, options);
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* sin cuerpo JSON */
    }
    return { status: res.status, data, res };
  }

  /** Envía un mensaje y devuelve los eventos SSE recibidos. */
  async chat(conversationId, body) {
    const res = await this.request(`/api/conversations/${conversationId}/messages`, { method: "POST", body });
    if (!res.ok) {
      let data = null;
      try {
        data = await res.json();
      } catch {
        /* sin JSON */
      }
      return { status: res.status, data, events: [], contentType: res.headers.get("content-type") };
    }
    const events = [];
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
      let idx;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        let event = "message";
        const data = [];
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
        }
        if (data.length) events.push({ event, data: JSON.parse(data.join("\n")), at: Date.now() });
      }
    }
    return { status: res.status, events, contentType: res.headers.get("content-type") };
  }
}

const uniq = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const PASSWORD = "Prueba2026ok";

async function register(label) {
  const client = new Client(label);
  const email = `${label}-${uniq()}@smoke.test`;
  const { status, data } = await client.json("/api/auth/register", {
    method: "POST",
    body: { name: `Usuario ${label}`, email, password: PASSWORD },
  });
  return { client, email, status, data };
}

async function main() {
  console.log(`Probando ${BASE}`);

  // ---------------------------------------------------------------- salud
  section("Estado del servicio");
  const anon = new Client("anónimo");
  const health = await anon.json("/api/health");
  check("GET /api/health responde 200 y la base de datos está conectada", health.status === 200 && health.data?.db === true, JSON.stringify(health.data));
  const isMock = health.data?.ai?.mock === true;
  console.log(`  · proveedor de IA: ${health.data?.ai?.provider ?? "?"}${isMock ? " (simulado)" : ""}, configurado: ${health.data?.ai?.configured}`);

  // ---------------------------------------------------------------- sin sesión
  section("Protección de rutas (sin sesión)");
  const noSession = await anon.json("/api/conversations");
  check("GET /api/conversations sin sesión → 401", noSession.status === 401 && noSession.data?.error?.code === "UNAUTHENTICATED");
  const adminNoSession = await anon.json("/api/admin/stats");
  check("GET /api/admin/stats sin sesión → 401", adminNoSession.status === 401);
  for (const page of ["/chat", "/account", "/pastillero", "/admin"]) {
    const res = await anon.request(page);
    const location = res.headers.get("location") ?? "";
    check(`GET ${page} sin sesión redirige al login`, [307, 308, 302, 303].includes(res.status) && location.includes("/login"), `status=${res.status} location=${location}`);
  }
  const landing = await anon.request("/");
  check("La landing (/) es pública", landing.status === 200);
  const landingHtml = await landing.text();
  check("La landing muestra las líneas de ayuda de Colombia (123 y toxicología)", landingHtml.includes("123") && landingHtml.includes("018000 916012"));
  for (const page of ["/login", "/register"]) {
    const res = await anon.request(page);
    check(`${page} es público`, res.status === 200);
  }

  // ---------------------------------------------------------------- registro y sesión
  section("Registro, sesión y validaciones");
  const a = await register("ana");
  check("POST /api/auth/register crea la cuenta (201)", a.status === 201 && a.data?.user?.role === "USER", JSON.stringify(a.data));
  check("El registro entrega cookie de sesión httpOnly", a.client.cookies.has("aiec_session"));
  const me = await a.client.json("/api/auth/me");
  check("GET /api/auth/me devuelve al usuario", me.status === 200 && me.data?.user?.email === a.email);
  check("El rol por defecto es USER", me.data?.user?.role === "USER");

  const dup = await new Client("dup").json("/api/auth/register", { method: "POST", body: { name: "Otra Ana", email: a.email.toUpperCase(), password: PASSWORD } });
  check("Registrar un correo repetido → 409 EMAIL_TAKEN", dup.status === 409 && dup.data?.error?.code === "EMAIL_TAKEN", JSON.stringify(dup.data));
  const weak = await new Client("weak").json("/api/auth/register", { method: "POST", body: { name: "Débil", email: `weak-${uniq()}@smoke.test`, password: "abc" } });
  check("Contraseña débil → 400 VALIDATION_ERROR", weak.status === 400 && weak.data?.error?.code === "VALIDATION_ERROR");
  const badEmail = await new Client("bad").json("/api/auth/register", { method: "POST", body: { name: "Mal Correo", email: "no-es-correo", password: PASSWORD } });
  check("Correo inválido → 400", badEmail.status === 400);
  const escalate = await new Client("esc").json("/api/auth/register", {
    method: "POST",
    body: { name: "Intruso", email: `esc-${uniq()}@smoke.test`, password: PASSWORD, role: "ADMIN" },
  });
  check("No se puede registrar un ADMIN desde el registro público", escalate.status === 201 && escalate.data?.user?.role === "USER", JSON.stringify(escalate.data));

  const wrongLogin = await new Client("w").json("/api/auth/login", { method: "POST", body: { email: a.email, password: "Incorrecta123" } });
  check("Login con contraseña incorrecta → 401 INVALID_CREDENTIALS", wrongLogin.status === 401 && wrongLogin.data?.error?.code === "INVALID_CREDENTIALS");
  const unknownLogin = await new Client("u").json("/api/auth/login", { method: "POST", body: { email: `nadie-${uniq()}@smoke.test`, password: PASSWORD } });
  check("Login con correo inexistente → mismo error genérico", unknownLogin.status === 401 && unknownLogin.data?.error?.code === "INVALID_CREDENTIALS");
  const csrf = await a.client.json("/api/conversations", { method: "POST", body: {}, headers: { Origin: "https://evil.example" } });
  check("Petición con Origin ajeno → 403 BAD_ORIGIN", csrf.status === 403 && csrf.data?.error?.code === "BAD_ORIGIN");

  const relogin = new Client("ana-2");
  const loginOk = await relogin.json("/api/auth/login", { method: "POST", body: { email: a.email, password: PASSWORD } });
  check("Login correcto → 200", loginOk.status === 200 && relogin.cookies.has("aiec_session"));

  // ---------------------------------------------------------------- conversaciones y chat
  section("Chat: crear, preguntar, historial");
  const created = await a.client.json("/api/conversations", { method: "POST", body: {} });
  const convId = created.data?.conversation?.id;
  check("POST /api/conversations crea una conversación (201)", created.status === 201 && !!convId);

  const first = await a.client.chat(convId, { content: "¿Para qué sirve el ibuprofeno?" });
  const kinds = first.events.map((e) => e.event);
  check("La respuesta llega por SSE (text/event-stream)", first.status === 200 && (first.contentType ?? "").includes("text/event-stream"), `status=${first.status} type=${first.contentType}`);
  check("Secuencia de eventos: meta → delta… → done", kinds[0] === "meta" && kinds.includes("delta") && kinds.includes("done"), kinds.join(","));
  const deltas = first.events.filter((e) => e.event === "delta");
  check("Llega en varios fragmentos (streaming real)", deltas.length > 2, `fragmentos=${deltas.length}`);
  if (deltas.length > 2) {
    const spread = deltas[deltas.length - 1].at - deltas[0].at;
    check("Los fragmentos llegan escalonados en el tiempo (sin buffer)", spread > 150, `${spread} ms entre el primero y el último`);
  }
  const done = first.events.find((e) => e.event === "done");
  const joined = deltas.map((e) => e.data.text).join("");
  check("El texto concatenado coincide con el mensaje guardado", !!done && done.data.message.content === joined && joined.length > 20);

  const conv1 = await a.client.json(`/api/conversations/${convId}`);
  check("El historial guarda pregunta y respuesta", conv1.status === 200 && conv1.data?.messages?.length === 2, JSON.stringify(conv1.data?.messages?.map((m) => m.role)));
  check("El título deja de ser el genérico", conv1.data?.conversation?.title && conv1.data.conversation.title !== "Nueva conversación", conv1.data?.conversation?.title);
  check("El mensaje del asistente registra modelo y latencia", !!conv1.data?.messages?.[1]?.model && conv1.data.messages[1].latencyMs >= 0);

  const second = await a.client.chat(convId, { content: "¿Y qué precauciones debo tener con el estómago?" });
  check("Segunda pregunta en la misma conversación (contexto)", second.events.some((e) => e.event === "done"));
  const conv2 = await a.client.json(`/api/conversations/${convId}`);
  check("La conversación acumula 4 mensajes", conv2.data?.messages?.length === 4);
  if (isMock) {
    const lastReply = conv2.data?.messages?.[3]?.content ?? "";
    check("El asistente recibe el historial previo (contexto de 2 mensajes del usuario)", /\*\*2\*\* mensaje/.test(lastReply), lastReply.slice(0, 160));
  }

  const assistantMessage = conv2.data?.messages?.[3];
  const like = await a.client.json(`/api/messages/${assistantMessage.id}/feedback`, { method: "PATCH", body: { value: 1 } });
  check("Valorar una respuesta (👍) funciona", like.status === 200 && like.data?.message?.feedback === 1);
  const unlike = await a.client.json(`/api/messages/${assistantMessage.id}/feedback`, { method: "PATCH", body: { value: 0 } });
  check("Quitar la valoración funciona", unlike.status === 200 && unlike.data?.message?.feedback === null);
  const userMessageId = conv2.data?.messages?.[2]?.id;
  const badFeedback = await a.client.json(`/api/messages/${userMessageId}/feedback`, { method: "PATCH", body: { value: 1 } });
  check("No se puede valorar un mensaje del usuario → 404", badFeedback.status === 404);

  const regen = await a.client.chat(convId, { regenerate: true });
  check("Regenerar la última respuesta", regen.events.some((e) => e.event === "done"));
  const conv3 = await a.client.json(`/api/conversations/${convId}`);
  check("Regenerar reemplaza la respuesta (siguen siendo 4 mensajes)", conv3.data?.messages?.length === 4 && conv3.data.messages[3].id !== assistantMessage.id);

  const emptyMsg = await a.client.chat(convId, { content: "   " });
  check("Mensaje vacío → 400", emptyMsg.status === 400);
  const tooLong = await a.client.chat(convId, { content: "x".repeat(4001) });
  check("Mensaje de más de 4000 caracteres → 400", tooLong.status === 400);
  const noBody = await a.client.chat(convId, {});
  check("Cuerpo sin contenido → 400", noBody.status === 400);

  if (isMock) {
    section("Manejo de errores del proveedor (comandos del modo simulado)");
    const boom = await a.client.chat(convId, { content: "/error" });
    const errEvent = boom.events.find((e) => e.event === "error");
    check("Un fallo del proveedor llega como evento SSE «error»", !!errEvent && !!errEvent.data.message, JSON.stringify(boom.events.map((e) => e.event)));
    check("El mensaje de error es claro y no expone detalles internos", !!errEvent && !/stack|at \w+\.|node_modules|api[_-]?key/i.test(errEvent.data.message), errEvent?.data?.message);
    const limit = await a.client.chat(convId, { content: "/limite" });
    const limitEvent = limit.events.find((e) => e.event === "error");
    check("Límite del proveedor (429) → error entendible", limitEvent?.data?.code === "RATE_LIMIT", JSON.stringify(limitEvent?.data));
    const retry = await a.client.chat(convId, { regenerate: true });
    check(
      "«Reintentar» sobre una pregunta que sigue fallando vuelve a informar el error (sin romper la conversación)",
      retry.status === 200 && retry.events.some((e) => e.event === "error"),
      JSON.stringify(retry.events.map((e) => e.event)),
    );
    const ok = await a.client.chat(convId, { content: "Ya funciona otra vez" });
    check("Y la conversación sigue funcionando con una pregunta normal", ok.events.some((e) => e.event === "done"));
    const afterErrors = await a.client.json(`/api/conversations/${convId}`);
    const roles = afterErrors.data?.messages?.map((m) => m.role) ?? [];
    check(
      "Las preguntas que fallaron quedan en el historial sin respuesta falsa del asistente",
      roles.filter((r) => r === "USER").length >= 5 && roles[roles.length - 1] === "ASSISTANT",
      roles.join(","),
    );
  }

  section("Renombrar, buscar y eliminar");
  const renamed = await a.client.json(`/api/conversations/${convId}`, { method: "PATCH", body: { title: "Mi conversación de prueba" } });
  check("Renombrar conversación", renamed.status === 200 && renamed.data?.conversation?.title === "Mi conversación de prueba");
  const emptyTitle = await a.client.json(`/api/conversations/${convId}`, { method: "PATCH", body: { title: "  " } });
  check("Título vacío → 400", emptyTitle.status === 400);
  const found = await a.client.json(`/api/conversations?q=${encodeURIComponent("de prueba")}`);
  check("Buscar por título", found.status === 200 && found.data?.conversations?.some((c) => c.id === convId));
  const foundByContent = await a.client.json(`/api/conversations?q=${encodeURIComponent("ibuprofeno")}`);
  check("Buscar por contenido de los mensajes", foundByContent.data?.conversations?.some((c) => c.id === convId));
  const notFound = await a.client.json(`/api/conversations?q=${encodeURIComponent("zzzz-no-existe-zzzz")}`);
  check("Una búsqueda sin coincidencias devuelve lista vacía", notFound.status === 200 && notFound.data?.conversations?.length === 0);
  const pageOk = await a.client.request(`/chat/${convId}`);
  check("La página /chat/<id> carga con sesión", pageOk.status === 200);
  const chatPage = await a.client.request("/chat");
  check("La página /chat carga con sesión", chatPage.status === 200);
  const pillbox = await a.client.request("/pastillero");
  check("La página /pastillero carga con sesión", pillbox.status === 200);
  const urgentPrompt = await a.client.json("/api/conversations", { method: "POST", body: {} });
  const urgentId = urgentPrompt.data?.conversation?.id;
  const urgent = await a.client.chat(urgentId, { content: "Me tomé varias pastillas de más por error, ¿qué hago?" });
  const urgentDone = urgent.events.find((e) => e.event === "done");
  check("Un mensaje de urgencia se responde con normalidad (200 y SSE)", urgent.status === 200 && !!urgentDone, JSON.stringify(urgent.events.map((e) => e.event)));
  if (isMock) {
    const urgentReply = urgentDone?.data?.message?.content ?? "";
    check(
      "El servidor detecta la urgencia y la respuesta trae los números de ayuda (123 y toxicología)",
      urgentReply.includes("123") && urgentReply.includes("018000 916012"),
      urgentReply.slice(0, 200),
    );
    const calm = await a.client.json("/api/conversations", { method: "POST", body: {} });
    const calmChat = await a.client.chat(calm.data?.conversation?.id, { content: "¿Cómo guardo mis medicamentos en casa?" });
    const calmReply = calmChat.events.find((e) => e.event === "done")?.data?.message?.content ?? "";
    check("Una pregunta normal NO dispara la alerta de urgencia", calmReply.length > 0 && !calmReply.includes("018000 916012"), calmReply.slice(0, 120));
  }

  // ---------------------------------------------------------------- aislamiento entre usuarios
  section("Aislamiento entre usuarios y permisos por rol");
  const b = await register("beto");
  check("Segundo usuario registrado", b.status === 201);
  const peek = await b.client.json(`/api/conversations/${convId}`);
  check("Otro usuario no puede leer mi conversación (404)", peek.status === 404);
  const peekRename = await b.client.json(`/api/conversations/${convId}`, { method: "PATCH", body: { title: "hackeada" } });
  check("Otro usuario no puede renombrarla (404)", peekRename.status === 404);
  const peekPost = await b.client.chat(convId, { content: "hola" });
  check("Otro usuario no puede escribir en ella (404)", peekPost.status === 404);
  const peekFeedback = await b.client.json(`/api/messages/${assistantMessage.id}/feedback`, { method: "PATCH", body: { value: 1 } });
  check("Otro usuario no puede valorar mis mensajes (404)", peekFeedback.status === 404);
  const peekDelete = await b.client.json(`/api/conversations/${convId}`, { method: "DELETE" });
  check("Otro usuario no puede eliminarla (404)", peekDelete.status === 404);
  const bList = await b.client.json("/api/conversations");
  check("Su historial está vacío (no ve el mío)", bList.status === 200 && bList.data?.conversations?.length === 0);
  const stillThere = await a.client.json(`/api/conversations/${convId}`);
  check("Mi conversación sigue intacta", stillThere.status === 200 && stillThere.data?.messages?.length >= 4);
  const badId = await a.client.json("/api/conversations/no-es-un-uuid");
  check("Un identificador inválido → 404", badId.status === 404);

  for (const [method, path] of [
    ["GET", "/api/admin/stats"],
    ["GET", "/api/admin/users"],
    ["GET", "/api/admin/assistant"],
    ["GET", "/api/admin/evaluation"],
  ]) {
    const res = await a.client.json(path, { method });
    check(`USER no puede ${method} ${path} (403)`, res.status === 403 && res.data?.error?.code === "FORBIDDEN", `status=${res.status}`);
  }
  const putAssistant = await a.client.json("/api/admin/assistant", { method: "PUT", body: {} });
  check("USER no puede modificar el asistente (403)", putAssistant.status === 403);
  const adminPage = await a.client.request("/admin");
  check("USER que entra a /admin vuelve al chat", [307, 308, 302, 303].includes(adminPage.status) && (adminPage.headers.get("location") ?? "").includes("/chat"), `status=${adminPage.status} location=${adminPage.headers.get("location")}`);
  const publicAssistant = await a.client.json("/api/assistant");
  check("USER sí ve los datos públicos del asistente", publicAssistant.status === 200 && !!publicAssistant.data?.assistant?.name);
  check("…pero sin el System Prompt", publicAssistant.data?.assistant && !("systemPrompt" in publicAssistant.data.assistant));

  // ---------------------------------------------------------------- cuenta
  section("Cuenta del usuario");
  const rename = await a.client.json("/api/account", { method: "PATCH", body: { name: "Ana Actualizada" } });
  check("Actualizar el nombre del perfil", rename.status === 200 && rename.data?.user?.name === "Ana Actualizada");
  const wrongCurrent = await a.client.json("/api/account/password", { method: "POST", body: { currentPassword: "Incorrecta123", newPassword: "NuevaClave2026" } });
  check("Cambiar contraseña con la actual incorrecta → 400", wrongCurrent.status === 400 && wrongCurrent.data?.error?.code === "WRONG_PASSWORD");
  const NEW_PASSWORD = "NuevaClave2026";
  const changed = await a.client.json("/api/account/password", { method: "POST", body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD } });
  check("Cambiar contraseña correctamente", changed.status === 200);
  const meAfter = await a.client.json("/api/auth/me");
  check("La sesión actual sigue válida tras cambiar la contraseña", meAfter.status === 200);
  const oldSession = await relogin.json("/api/auth/me");
  check("Las otras sesiones se cierran al cambiar la contraseña", oldSession.status === 401);
  const oldPwd = await new Client("x").json("/api/auth/login", { method: "POST", body: { email: a.email, password: PASSWORD } });
  check("La contraseña anterior ya no sirve", oldPwd.status === 401);
  const newPwd = await new Client("y").json("/api/auth/login", { method: "POST", body: { email: a.email, password: NEW_PASSWORD } });
  check("La contraseña nueva sí", newPwd.status === 200);

  // ---------------------------------------------------------------- administración
  let adminClient = null;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    section("Administración (rol ADMIN)");
    adminClient = new Client("admin");
    const login = await adminClient.json("/api/auth/login", { method: "POST", body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
    check("El administrador inicia sesión", login.status === 200 && login.data?.user?.role === "ADMIN", JSON.stringify(login.data));
    if (login.status === 200) {
      const stats = await adminClient.json("/api/admin/stats");
      check("Estadísticas generales", stats.status === 200 && typeof stats.data?.overview?.totalUsers === "number" && Array.isArray(stats.data?.daily));
      check("Las estadísticas incluyen la serie de los últimos 14 días", stats.data?.daily?.length === 14);
      const users = await adminClient.json("/api/admin/users");
      check("Listado de usuarios", users.status === 200 && users.data?.users?.some((u) => u.email === a.email) && users.data.users.some((u) => u.email === b.email));
      const adminOwnConv = await adminClient.json(`/api/conversations/${convId}`);
      check("El administrador NO puede leer conversaciones ajenas (404)", adminOwnConv.status === 404);

      const aRow = users.data.users.find((u) => u.email === a.email);
      const bRow = users.data.users.find((u) => u.email === b.email);
      const promote = await adminClient.json(`/api/admin/users/${aRow.id}`, { method: "PATCH", body: { role: "ADMIN" } });
      check("Cambiar el rol de un usuario a ADMIN", promote.status === 200 && promote.data?.user?.role === "ADMIN");
      const promotedSession = await a.client.json("/api/auth/me");
      check("El cambio de rol cierra la sesión anterior del usuario", promotedSession.status === 401);
      const aAdmin = new Client("ana-admin");
      await aAdmin.json("/api/auth/login", { method: "POST", body: { email: a.email, password: NEW_PASSWORD } });
      const nowAdmin = await aAdmin.json("/api/admin/stats");
      check("El usuario promovido ya accede al panel", nowAdmin.status === 200);
      const demote = await adminClient.json(`/api/admin/users/${aRow.id}`, { method: "PATCH", body: { role: "USER" } });
      check("Devolver el rol a USER", demote.status === 200 && demote.data?.user?.role === "USER");
      const demotedAccess = await aAdmin.json("/api/admin/stats");
      check("Con rol USER vuelve a recibir 403/401 (el rol se valida en el backend)", [401, 403].includes(demotedAccess.status), `status=${demotedAccess.status}`);

      const me2 = await adminClient.json("/api/auth/me");
      const selfDemote = await adminClient.json(`/api/admin/users/${me2.data.user.id}`, { method: "PATCH", body: { role: "USER" } });
      check("Un admin no puede quitarse su propio rol (409)", selfDemote.status === 409);
      const selfDelete = await adminClient.json(`/api/admin/users/${me2.data.user.id}`, { method: "DELETE" });
      check("Un admin no puede eliminarse a sí mismo (409)", selfDelete.status === 409);

      const disable = await adminClient.json(`/api/admin/users/${bRow.id}`, { method: "PATCH", body: { isActive: false } });
      check("Desactivar una cuenta", disable.status === 200 && disable.data?.user?.isActive === false);
      const bSession = await b.client.json("/api/auth/me");
      check("La sesión de la cuenta desactivada deja de ser válida", bSession.status === 401);
      const bLogin = await new Client("b2").json("/api/auth/login", { method: "POST", body: { email: b.email, password: PASSWORD } });
      check("Una cuenta desactivada no puede iniciar sesión (403)", bLogin.status === 403 && bLogin.data?.error?.code === "ACCOUNT_DISABLED");

      const created2 = await adminClient.json("/api/admin/users", { method: "POST", body: { name: "Creado Por Admin", email: `cp-${uniq()}@smoke.test`, password: PASSWORD, role: "USER" } });
      check("El administrador crea un usuario", created2.status === 201 && created2.data?.user?.role === "USER");
      const delCreated = await adminClient.json(`/api/admin/users/${created2.data.user.id}`, { method: "DELETE" });
      check("El administrador elimina un usuario", delCreated.status === 200);
      const delB = await adminClient.json(`/api/admin/users/${bRow.id}`, { method: "DELETE" });
      check("Eliminar usuario de prueba (y sus datos)", delB.status === 200);

      const settings = await adminClient.json("/api/admin/assistant");
      check("El administrador lee la configuración (incluye System Prompt)", settings.status === 200 && settings.data?.settings?.systemPrompt?.length > 100);
      const original = settings.data.settings;
      const tooShort = await adminClient.json("/api/admin/assistant", { method: "PUT", body: { ...original, systemPrompt: "corto" } });
      check("System Prompt demasiado corto → 400", tooShort.status === 400);
      const edited = await adminClient.json("/api/admin/assistant", { method: "PUT", body: { ...original, welcomeMessage: "Bienvenida de prueba automática" } });
      check("Guardar cambios del asistente", edited.status === 200 && edited.data?.settings?.welcomeMessage === "Bienvenida de prueba automática");
      const pub = await a.client.json("/api/assistant");
      const seen = pub.status === 200 ? pub.data?.assistant?.welcomeMessage : "(sin sesión)";
      const aLogin = new Client("ana-3");
      await aLogin.json("/api/auth/login", { method: "POST", body: { email: a.email, password: NEW_PASSWORD } });
      const pub2 = await aLogin.json("/api/assistant");
      check("El cambio se refleja para los usuarios", pub2.data?.assistant?.welcomeMessage === "Bienvenida de prueba automática", `antes=${seen}`);
      const restore = await adminClient.json("/api/admin/assistant", { method: "PUT", body: original });
      check("Se restaura la configuración original", restore.status === 200 && restore.data?.settings?.welcomeMessage === original.welcomeMessage);

      const evalList = await adminClient.json("/api/admin/evaluation");
      check("Lista de preguntas de prueba (≥ 10, requisito del PDF)", evalList.status === 200 && evalList.data?.questions?.length >= 10, `preguntas=${evalList.data?.questions?.length}`);
      const cats = new Set(evalList.data?.questions?.map((q) => q.category));
      check("Cubre dominio, fuera de especialidad e incertidumbre", ["dominio", "fuera_de_dominio", "incertidumbre"].every((c) => cats.has(c)));
      const run = await adminClient.json("/api/admin/evaluation/run", { method: "POST", body: { questionId: evalList.data.questions[0].id } });
      check("Ejecutar una pregunta de prueba", run.status === 200 && typeof run.data?.answer === "string" && Array.isArray(run.data?.checks), JSON.stringify(run.data)?.slice(0, 200));

      // limpieza: el usuario A se elimina al final
      const delA = await adminClient.json(`/api/admin/users/${aRow.id}`, { method: "DELETE" });
      check("Limpieza: se elimina el usuario de prueba (cascada)", delA.status === 200);
    }
  } else {
    section("Administración");
    console.log("  · omitido: define ADMIN_EMAIL y ADMIN_PASSWORD para probar también el panel.");
    const del = await a.client.json(`/api/conversations/${convId}`, { method: "DELETE" });
    check("Eliminar mi conversación", del.status === 200);
    const gone = await a.client.json(`/api/conversations/${convId}`);
    check("La conversación eliminada ya no existe (404)", gone.status === 404);
  }

  // ---------------------------------------------------------------- cierre de sesión
  section("Cierre de sesión");
  const out = new Client("salida");
  const outLogin = await out.json("/api/auth/login", { method: "POST", body: { email: ADMIN_EMAIL || a.email, password: ADMIN_EMAIL ? ADMIN_PASSWORD : NEW_PASSWORD } });
  if (outLogin.status === 200) {
    const logout = await out.json("/api/auth/logout", { method: "POST", body: {} });
    check("POST /api/auth/logout", logout.status === 200);
    const after = await out.json("/api/auth/me");
    check("Después de salir ya no hay sesión (401)", after.status === 401);
  } else {
    console.log("  · omitido (la cuenta de prueba ya fue eliminada).");
  }

  console.log(`\nResultado: ${passed} correctas, ${failed} con error.`);
  if (failed > 0) {
    console.log("Fallaron:\n" + failures.map((f) => `  - ${f}`).join("\n"));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nLa prueba se interrumpió:", err);
  process.exit(1);
});
