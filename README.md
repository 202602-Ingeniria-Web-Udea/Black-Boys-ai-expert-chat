# Botiquín · AI Expert Chat

Aplicación web **full stack** tipo chat con un **asistente de inteligencia artificial especializado en salud y medicamentos**. Es el proyecto integrador de Ingeniería Web: una sola aplicación que en el **Taller 2** responde con un endpoint simulado y en el **Proyecto de IA** usa un modelo de lenguaje real, con System Prompt, contexto conversacional, manejo de errores, pruebas y despliegue.

**Botiquín** explica para qué sirve un medicamento, cómo usarlo con seguridad, cómo leer un prospecto y cuándo conviene consultar, pensado para personas de Colombia. Respeta la regla del enunciado para Salud: **educación y hábitos saludables, sin diagnósticos ni prescripción de tratamientos** (tampoco da dosis). Además de las preguntas, trae un **pastillero** personal, una **capa de seguridad** que reacciona ante urgencias y una interfaz clara, probada en celular.

> **Especialidad incluida por defecto: Salud y medicamentos** (asistente «Botiquín»). El enunciado exige que cada equipo trabaje una especialidad **diferente**: confirma con el docente que ninguna otra tiene esta. Si debes cambiarla, el proyecto trae otras cinco plantillas listas (la identidad y el prompt cambian en un clic; la portada y el pastillero están pensados para salud). Ver [Cambiar la especialidad](#cambiar-la-especialidad).

## Integrantes

| Integrante | 
|---|
| Julián De Jesús Tobón Botero |
| Bryan David Molina Dominguez |
| Brayan Jaraba |

- **Docente:** Juan Pablo Arango · **Asignatura:** Ingeniería Web
- **Entrega:** domingo 29 de noviembre de 2026, 11:59 p. m.
- **Repositorio:** https://github.com/202602-Ingeniria-Web-Udea/Black-Boys-ai-expert-chat.git
- **Aplicación desplegada:** https://black-boys-ai-expert-chat.vercel.app
- **Credenciales Email: admin@example.com Contraseña: 12345678

## Contenido

1. [Qué incluye](#qué-incluye)
2. [Tecnologías](#tecnologías)
3. [Inicio rápido (local)](#inicio-rápido-local)
4. [Probar sin clave de API (modo simulado)](#probar-sin-clave-de-api-modo-simulado)
5. [Conectar un modelo de IA real](#conectar-un-modelo-de-ia-real)
6. [Cambiar la especialidad](#cambiar-la-especialidad)
7. [Despliegue](#despliegue)
8. [Variables de entorno](#variables-de-entorno)
9. [Scripts](#scripts)
10. [Pruebas](#pruebas)
11. [Estructura del proyecto](#estructura-del-proyecto)
12. [Arquitectura en una página](#arquitectura-en-una-página)
13. [Seguridad](#seguridad)
14. [Cumplimiento del enunciado](#cumplimiento-del-enunciado)
15. [Solución de problemas](#solución-de-problemas)
16. [Lista de entrega](#lista-de-entrega)

## Qué incluye

**Autenticación y roles**
- Landing, registro, inicio de sesión y cierre de sesión. Sesión en cookie `httpOnly`; rutas y API protegidas.
- Roles **ADMIN** y **USER**. El rol se valida en el backend en cada petición (no solo en la interfaz).
- Cuenta personal: cambio de nombre y de contraseña (cierra las demás sesiones).

**Chat**
- Crear conversaciones, enviar preguntas y ver la respuesta **en streaming**, con indicador de carga y botón para detener.
- Historial propio con búsqueda, renombrar, eliminar y exportar a Markdown. Un usuario nunca ve las conversaciones de otro (tampoco un ADMIN).
- Regenerar la última respuesta, «Reintentar» tras un error, calificar con 👍/👎 y copiar respuestas o bloques de código.
- Respuestas en Markdown con resaltado de código. Títulos automáticos de conversación.
- Errores claros en español (límite de uso, tiempo agotado, modelo no disponible, clave inválida…) sin exponer detalles técnicos.

**Especialización de la IA**
- **System Prompt** estructurado en identidad, dominio, comportamiento, límites y formato de respuesta, editable desde el panel. El de Botiquín prohíbe diagnosticar, recetar y dar dosis, e indica cuándo remitir al médico, al farmacéutico o a urgencias.
- Respuestas con una estructura fija para medicamentos (qué es, cómo usarlo con seguridad, precauciones, efectos, cuándo consultar) y **avisos destacados** (`Atención`, `Urgente`, `Consejo`) que la interfaz dibuja como recuadros.
- Seis plantillas de especialidad (Salud y medicamentos, Programación, Deporte, Mecánica, Gastronomía y Turismo), cada una con su batería de 14 preguntas de prueba.
- Contexto conversacional: el modelo recibe los últimos *N* mensajes de la conversación (configurable).

**Seguridad para una aplicación de salud**
- **Detección de urgencias** (intoxicación o sobredosis, emergencia médica, crisis emocional) con reglas propias en el servidor y en el navegador: si el mensaje suena a urgencia, la interfaz muestra **de inmediato** los números de ayuda de Colombia (123, toxicología 018000 916012, Línea 106) y el modelo recibe instrucciones de empezar por lo urgente. Funciona aunque el proveedor de IA no responda.
- Panel **Ayuda** siempre disponible con las líneas de ayuda y enlaces oficiales (INVIMA, MedlinePlus, Punto Azul).
- Aviso permanente de que la información es educativa y no reemplaza a un profesional.

**Pastillero personal**
- Agenda de medicamentos con horarios y días: marcar cada toma como tomada u omitida, vista del día y de la semana con porcentaje de adherencia, imprimir la hoja semanal, exportar a calendario (`.ics`) y copia de seguridad en JSON.
- Los datos viven **solo en el navegador** de la persona (no se envían al servidor) y la aplicación **nunca sugiere ni calcula cantidades**: no existe un campo de dosis.

**Diseño y accesibilidad**
- Interfaz clara sobre fondo blanco, tipografía de alta legibilidad (Atkinson Hyperlegible), motivo de cápsula y una ilustración interactiva en la portada.
- Control del tamaño del texto del chat, lectura de las respuestas en voz alta, foco visible, objetivos táctiles de 44 px, enlace «Saltar al contenido» y respeto de «reducir movimiento».

**Administración (solo ADMIN)**
- **Resumen:** usuarios (total, activos, nuevos), conversaciones, mensajes, latencia media, valoraciones 👍/👎, actividad de los últimos 14 días y usuarios más activos. Solo agregados: el ADMIN no lee el contenido de las conversaciones.
- **Usuarios:** buscar, crear, cambiar rol, activar/desactivar y eliminar (con protecciones: no se puede quitar el rol ni eliminar al último administrador ni a uno mismo).
- **Asistente:** nombre, especialidad, bienvenida, preguntas sugeridas, System Prompt, modelo, temperatura, longitud máxima y memoria. Cargar plantillas de especialidad.
- **Pruebas:** ejecuta la batería de preguntas contra el asistente actual y descarga un informe de evidencia en Markdown.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 |
| Backend | API Routes de Next.js (Route Handlers) · `proxy.ts` para proteger rutas |
| Datos | PostgreSQL (Supabase en producción, Docker en local) con `pg` y SQL parametrizado |
| Autenticación | `bcryptjs` (contraseñas) · `jose` (JWT en cookie `httpOnly`) · `zod` (validación) |
| IA | Cliente propio compatible con la API «Chat Completions»: Groq, Gemini, OpenAI, Ollama u otro |
| Calidad | Vitest · ESLint · TypeScript estricto · pruebas de humo de extremo a extremo |

No se usa Prisma (el enunciado lo permite pero no lo exige): el esquema vive en `db/migrations/*.sql` y se aplica con `npm run db:migrate`.

## Inicio rápido (local)

**Requisitos:** Node.js 20.9 o superior (se recomienda 22) y npm. Docker es opcional (para tener PostgreSQL sin instalar nada).

```bash
npm install          # 1. dependencias
npm run env:init     # 2. crea .env con secretos aleatorios y muestra las credenciales
npm run db:up        # 3. PostgreSQL en Docker (puerto 5433)
npm run db:setup     # 4. crea las tablas y la cuenta ADMIN (+ usuario demo)
npm run dev          # 5. http://localhost:3000
```

`npm run env:init` imprime las credenciales **una sola vez** (también quedan en tu `.env`):

- Administrador: `admin@example.com` · contraseña generada
- Usuario demo: `demo@example.com` · contraseña generada

**Sin Docker:** usa cualquier PostgreSQL 13+ (instalado en tu equipo o un proyecto de [Supabase](docs/DESPLIEGUE.md)). Ejecuta `npm run env:init`, cambia `DATABASE_URL` en `.env` por tu conexión y continúa con `npm run db:setup` y `npm run dev`.

**Producción local:** `npm run build && npm start`.

> El archivo `.env` contiene secretos y está en `.gitignore`: **nunca** lo subas a GitHub. El repositorio solo incluye `.env.example`, sin valores reales.

## Probar sin clave de API (modo simulado)

Con `AI_PROVIDER=mock` (valor por defecto) la aplicación responde con un **endpoint simulado**: no gasta cuota y permite probar la interfaz, el historial, la persistencia, los roles y los estados de carga y error. Es el entregable del Taller 2.

El modo simulado entiende tres comandos para ensayar casos límite; escríbelos como mensaje en el chat:

| Comando | Qué simula |
|---|---|
| `/error` | El servicio de IA no está disponible (se ve el mensaje de error y el botón «Reintentar») |
| `/limite` | El proveedor devuelve «demasiadas solicitudes» |
| `/lento` | Una respuesta lenta, útil para ver el streaming y el botón «Detener» |

El simulador **no contiene información médica**: muestra la estructura que tendría una respuesta real (títulos, listas y avisos). Si escribes algo que suena a urgencia (por ejemplo «me tomé varias pastillas de más por error»), verás el aviso de ayuda inmediata de la interfaz y el aviso `Urgente` en la respuesta.

## Conectar un modelo de IA real

Todos los proveedores usan el mismo cliente (protocolo «Chat Completions»); solo cambian tres variables en `.env`:

| Proveedor | `AI_PROVIDER` | Modelo por defecto | Clave |
|---|---|---|---|
| Groq | `groq` | `openai/gpt-oss-20b` | `AI_API_KEY` (o `GROQ_API_KEY`) |
| Google Gemini | `gemini` | `gemini-flash-latest` | `AI_API_KEY` (o `GEMINI_API_KEY`) |
| OpenAI | `openai` | `gpt-5-mini` | `AI_API_KEY` (o `OPENAI_API_KEY`) |
| Ollama | `ollama` | `llama3.2` | no requiere; define `AI_BASE_URL` |
| Otro compatible con OpenAI | `custom` | el que indiques en `AI_MODEL` | `AI_API_KEY` y `AI_BASE_URL` |

Ejemplo con Groq (hay un plan gratuito):

```bash
# .env
AI_PROVIDER=groq
AI_API_KEY=pega-aquí-tu-clave
```

1. Reinicia `npm run dev` (las variables se leen al arrancar).
2. Entra como ADMIN → **Pruebas**: debe indicar el proveedor activo y, si algo falta, qué es.
3. Los nombres de modelo cambian con el tiempo: si el proveedor retira uno, define `AI_MODEL` o cámbialo en **Administración → Asistente → Modelo** sin volver a desplegar.

**Ollama y Vercel:** Vercel no puede ejecutar Ollama. Para la demostración final aloja Ollama en un servidor accesible desde internet y apunta a él: `AI_PROVIDER=ollama` y `AI_BASE_URL=https://tu-servidor/v1`.

La clave de la API **solo existe en el servidor**: el navegador habla con `/api/...` y nunca ve el proveedor.

## Cambiar la especialidad

El enunciado pide una especialidad distinta por equipo y un único asistente. Hay tres formas de elegirla, de la más sencilla a la más personalizada:

1. **Plantilla desde el panel** (recomendado): entra como ADMIN → **Asistente** → *Empezar desde una plantilla*, elige la especialidad, pulsa **Cargar plantilla** y luego **Guardar cambios**. Cambian la identidad, el System Prompt, la bienvenida y las preguntas sugeridas; la batería de **Pruebas** pasa a la de esa especialidad.
2. **Plantilla inicial por variable:** define `ASSISTANT_PRESET` en `.env` antes del primer arranque (o antes de pulsar **Restablecer valores por defecto**).
3. **Especialidad propia:** edita los campos en el panel o crea una plantilla nueva en `src/lib/assistant/presets/`. La guía paso a paso está en [`docs/PLANTILLAS_ESPECIALIDAD.md`](docs/PLANTILLAS_ESPECIALIDAD.md). El enunciado exige la aprobación del docente para temáticas distintas de las listadas.

> La **portada**, el **pastillero** y la **capa de seguridad** están escritos para salud. Si cambias de especialidad, el asistente, su System Prompt, las sugerencias y las pruebas cambian solos, pero esos textos de la portada deberás adaptarlos (`src/app/page.tsx`).

| `ASSISTANT_PRESET` | Asistente | Alcance |
|---|---|---|
| `salud` (por defecto) | Botiquín | Medicamentos y hábitos saludables, sin diagnósticos ni prescripción ni dosis |
| `programacion` | Mentor de Código | Explicación de código, conceptos y errores |
| `deporte` | Coach Deportivo | Entrenamiento, técnica, hábitos y reglas deportivas |
| `mecanica` | Asesor Mecánico | Mecánica automotriz: mantenimiento y orientación sobre fallas |
| `gastronomia` | Chef Asistente | Recetas, técnicas y sustitución de ingredientes |
| `turismo` | Guía de Viajes | Destinos y planificación de viajes |

## Despliegue

Resumen (guía completa paso a paso, con solución de problemas, en [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md)):

1. **Supabase:** crea un proyecto y copia la cadena de conexión (botón *Connect*). Aplica las migraciones y crea el administrador desde tu PC con la cadena **Session pooler** (puerto 5432):
   ```bash
   DATABASE_URL="postgresql://postgres.<ref>:<clave>@<host>:5432/postgres" \
   ADMIN_EMAIL=tu-correo@dominio.com ADMIN_PASSWORD="una-clave-segura-123" SEED_DEMO_USER=false \
   npm run db:setup
   ```
2. **GitHub:** sube el código (sin `.env`) y da acceso al docente.
3. **Vercel:** importa el repositorio y define las variables de entorno (`DATABASE_URL` con la cadena **Transaction pooler**, puerto 6543, `AUTH_SECRET`, `AI_PROVIDER`, `AI_API_KEY`, y `ASSISTANT_PRESET` solo si tu especialidad no es Salud y medicamentos).
4. Abre la URL pública, inicia sesión como ADMIN y comprueba **Pruebas**.

`GET /api/health` responde el estado de la aplicación, la base de datos y el proveedor de IA (sin exponer secretos).

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). Las imprescindibles son `DATABASE_URL` y `AUTH_SECRET`.

| Variable | Descripción | Por defecto |
|---|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL / Supabase | local: `…localhost:5433/aiexpert` |
| `DATABASE_SSL` | `auto`, `true` o `false` (auto = SSL si el host no es local) | `auto` |
| `DATABASE_POOL_MAX` | Conexiones máximas por instancia | `5` |
| `AUTH_SECRET` | Secreto para firmar la sesión (≥ 32 caracteres) | — (`npm run env:init` lo genera) |
| `AI_PROVIDER` | `mock`, `groq`, `gemini`, `openai`, `ollama` o `custom` | `mock` |
| `AI_API_KEY` | Clave del proveedor (solo servidor) | — |
| `AI_MODEL` | Modelo (si se omite, el del proveedor; editable en el panel) | — |
| `AI_BASE_URL` | Endpoint para `ollama` / `custom` | — |
| `AI_TIMEOUT_MS` | Tiempo máximo de espera al modelo | `50000` |
| `AI_MAX_RETRIES` | Reintentos ante fallos transitorios (0–3) | `1` |
| `AI_REASONING_EFFORT` | `minimal`, `low`, `medium` o `high` (modelos de razonamiento) | según proveedor |
| `AI_AUTO_TITLE` | Títulos de conversación generados por el modelo | `true` |
| `ASSISTANT_PRESET` | Plantilla de especialidad inicial | `salud` |
| `CHAT_RATE_LIMIT_PER_MIN` | Mensajes por usuario por minuto | `15` |
| `STATS_TIMEZONE` | Zona horaria de las estadísticas diarias del panel | `America/Bogota` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Cuenta ADMIN que crea `npm run db:seed` | — |
| `ADMIN_RESET_PASSWORD` | `true` para restablecer la contraseña del ADMIN existente | `false` |
| `SEED_DEMO_USER`, `DEMO_EMAIL`, `DEMO_PASSWORD` | Usuario USER de demostración | `false` |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Desarrollo, compilación y ejecución en producción |
| `npm run env:init` | Genera `.env` con secretos aleatorios |
| `npm run db:up` / `db:down` | Inicia / detiene PostgreSQL en Docker |
| `npm run db:migrate` | Aplica las migraciones SQL pendientes (idempotente) |
| `npm run db:seed` | Crea o actualiza la cuenta ADMIN (y el usuario demo si se pidió) |
| `npm run db:setup` | `db:migrate` + `db:seed` |
| `npm run typecheck` / `lint` / `test` | TypeScript, ESLint y pruebas unitarias (Vitest) |
| `npm run check` | Los tres anteriores en secuencia |
| `npm run smoke [URL]` | Prueba de humo de extremo a extremo contra una instancia en ejecución |
| `npm run eval [URL] [--out archivo]` | Ejecuta la batería de preguntas de prueba y guarda el informe |

## Pruebas

- **Unitarias (`npm run check`):** **395 pruebas en 15 archivos**: cliente de IA contra un servidor falso (streaming, reintentos, adaptación a cada proveedor, errores), contexto conversacional, validaciones, plantillas y baterías de preguntas, **detector de urgencias** (54 casos, incluidas frases negadas e informativas que no deben alertar), **lógica del pastillero** (35: horarios, adherencia, calendario `.ics`, copia de seguridad) y utilidades.
- **De extremo a extremo (`npm run smoke`):** **113 comprobaciones** con la aplicación y la base de datos en marcha: registro, login, protección de rutas (incluida `/pastillero`), chat con streaming, alerta ante un mensaje de urgencia, historial, permisos entre usuarios, roles, administración y errores. Puede apuntar a una URL desplegada: `npm run smoke -- https://tu-app.vercel.app` (crea usuarios temporales; ver [`docs/PRUEBAS.md`](docs/PRUEBAS.md)).
- **Pruebas del asistente (§7 del enunciado):** 14 preguntas por especialidad —dominio, fuera de la especialidad, incertidumbre/limitaciones y seguridad— que se ejecutan desde **Administración → Pruebas** o con `npm run eval`, y generan el informe de evidencia. Las de Botiquín incluyen, por ejemplo, una pregunta de dosis para un niño (debe remitir, sin cifras), un medicamento inexistente (no debe inventar) y una frase de crisis emocional (debe ofrecer la Línea 106). Guía en [`docs/PRUEBAS.md`](docs/PRUEBAS.md).

La evidencia del modo simulado está en [`docs/evidencia/`](docs/evidencia/). **La evidencia con el modelo real debe generarla el equipo con su propia clave** (ver esa carpeta).

## Estructura del proyecto

```text
├─ .github/workflows/        Integración continua: tipos, estilo, pruebas y compilación
├─ db/migrations/            Esquema SQL (idempotente; también sirve pegado en el SQL Editor de Supabase)
├─ docs/                     Arquitectura, despliegue, pruebas, plantillas de especialidad y evidencia
├─ scripts/                  env:init, migrate, seed, smoke y eval
├─ src/
│  ├─ proxy.ts               Protección de rutas y roles (antes «middleware»)
│  ├─ app/                   Páginas (landing, login, registro, chat, pastillero, cuenta, admin) y API Routes
│  │  └─ api/                auth · conversations · messages · account · admin · assistant · health
│  ├─ components/            ui/ (botones, campos, diálogos), chat/, pastillero (pillbox/), safety/, admin/, auth/, site/, art/ (cápsulas)
│  └─ lib/
│     ├─ ai/                 Proveedores (simulado y compatible con OpenAI), errores, contexto, títulos
│     ├─ assistant/          System Prompt, valores por defecto y plantillas de especialidad (presets/)
│     ├─ auth/               JWT, contraseñas, sesión y redirecciones seguras
│     ├─ db/                 Pool de PostgreSQL y consultas (users, conversations, messages, settings, stats)
│     ├─ evaluation/         Batería de pruebas y selección por especialidad
│     ├─ safety/             Detector de urgencias y líneas de ayuda de Colombia
│     └─ pillbox/            Lógica pura del pastillero (horarios, adherencia, .ics, copia de seguridad)
└─ tests/                    Pruebas unitarias (Vitest)
```

## Arquitectura en una página

```text
Usuario ─▶ Interfaz web (React) ─▶ API Route de Next.js ─▶ Proveedor / modelo de IA
              ▲                          │  └─ valida sesión, rol y propiedad (backend)
              │                          ▼
              └──── respuesta en streaming (SSE) ◀── guarda usuarios, conversaciones y mensajes en PostgreSQL / Supabase
```

1. El navegador envía la pregunta a `POST /api/conversations/:id/messages` con su cookie de sesión.
2. El backend valida la sesión y que la conversación pertenezca al usuario, guarda la pregunta y arma el contexto: **System Prompt** + últimos mensajes.
3. Llama al proveedor de IA con la clave guardada en variables de entorno y reenvía la respuesta al navegador **en streaming**.
4. Al terminar guarda la respuesta; si el proveedor falla, informa el error (y conserva lo que alcanzó a generarse).

Detalle del modelo de datos, la API, el proveedor de IA, el System Prompt y las decisiones de seguridad en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Seguridad

- **Secretos fuera del repositorio:** `.env` y `.env.*` están en `.gitignore`; `.env.example` no trae valores reales. La clave de IA y `AUTH_SECRET` solo viven en el servidor.
- **Contraseñas** con bcrypt (coste 11); política mínima de 8 caracteres con letras y números; bloqueo temporal tras 5 intentos fallidos.
- **Sesión:** JWT firmado en cookie `httpOnly` + `SameSite=Lax` (y `Secure` cuando se accede por HTTPS), con 7 días de duración. En cada petición protegida se vuelve a leer el rol y el estado del usuario en la base de datos; al cambiar la contraseña, el rol o desactivar la cuenta se invalidan las sesiones anteriores.
- **Permisos en el backend:** `proxy.ts` es la primera barrera y cada endpoint repite la validación (`authorize`). Las consultas filtran por dueño, así que pedir la conversación de otro usuario devuelve 404.
- **CSRF y redirecciones:** verificación de origen en peticiones que modifican datos y lista blanca de destinos en `?next=`.
- **Entrada validada con zod**, consultas SQL **parametrizadas**, Markdown renderizado sin HTML crudo, cabeceras de seguridad (HSTS, `X-Frame-Options`, `nosniff`…).
- **Base de datos:** RLS activado sin políticas (la API REST pública de Supabase no puede leer nada); la app accede solo desde el servidor.
- **IA:** el cliente nunca recibe la clave ni detalles técnicos del proveedor; los mensajes de error son genéricos y los logs ocultan posibles claves; límite de mensajes por minuto por usuario.
- **Seguridad clínica:** el prompt prohíbe diagnosticar, recetar y dar dosis; un detector propio de urgencias refuerza esas reglas en el servidor y en la interfaz; el administrador solo ve estadísticas agregadas, nunca el contenido de las conversaciones.
- **Privacidad del pastillero:** los medicamentos y las tomas se guardan solo en el navegador de la persona (`localStorage`), separados por cuenta; no hay tablas ni API para ellos.

## Cumplimiento del enunciado

| Requisito del PDF | Dónde se cumple |
|---|---|
| §2 · Una especialidad y un único asistente | Fila única `assistant_settings`; plantillas en `src/lib/assistant/presets/` |
| §3 · Next.js, React, Tailwind, API Routes, Supabase/PostgreSQL | Ver [Tecnologías](#tecnologías) |
| §3 · Flujo Usuario → interfaz → backend → modelo; claves fuera del navegador | `src/app/api/conversations/[id]/messages/route.ts` y `src/lib/ai/` |
| §3 · Usuarios, conversaciones y mensajes en Supabase | Tablas `users`, `conversations`, `messages` ([migración](db/migrations/0001_init.sql)) |
| §3 · Despliegue en Vercel; Ollama en servidor externo | [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md) y [Conectar un modelo real](#conectar-un-modelo-de-ia-real) |
| §4 · Landing, registro, login, sesiones, protección de rutas, roles | `/`, `/register`, `/login`, cookie JWT, `src/proxy.ts`, rol en base de datos |
| §4 · Chat: crear, enviar, ver, historial propio, eliminar propias, carga y errores | `/chat`, `src/components/chat/`, `src/app/api/conversations/` |
| §4 · System Prompt (identidad, dominio, comportamiento, límites y formato) y demostración | `src/lib/assistant/presets/*.ts`, panel **Asistente** y **Pruebas** |
| §4 · ADMIN gestiona usuarios y roles, configura el asistente y ve estadísticas; permisos en backend | `/admin`, `/admin/usuarios`, `/admin/asistente`, `authorize()` y `proxy.ts` |
| §5 · Taller 2: respuestas simuladas / Proyecto IA: modelo real, contexto, errores, evaluación, despliegue | `AI_PROVIDER=mock` frente a un proveedor real; **misma aplicación** (§9) |
| §7 · Al menos 10 preguntas de prueba (dominio, fuera de especialidad, incertidumbre) | 14 por especialidad: [`docs/PRUEBAS.md`](docs/PRUEBAS.md) y `npm run eval` |
| §8 · README, arquitectura, modelo de datos, proveedor de IA, System Prompt | Este archivo y [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) |
| §8 · Evidencia de pruebas | [`docs/evidencia/`](docs/evidencia/) |
| §8 · Variables sensibles protegidas | `.gitignore`, `.env.example` sin valores reales; la clave solo en el servidor |

**Criterios de evaluación (§6) y dónde verlos**

| Criterio | Qué mirar |
|---|---|
| Interfaz y responsividad | Diseño claro sobre fondo blanco, tipografía de alta legibilidad, probado desde 390 px de ancho (portada, chat, pastillero y administración adaptados al celular) |
| Autenticación y roles | Registro/login, rutas protegidas, rol validado en backend, gestión de usuarios y roles |
| Persistencia y CRUD | Conversaciones (crear, listar, renombrar, eliminar), mensajes, usuarios y configuración en PostgreSQL |
| Funcionalidad del chat | Streaming, detener, regenerar, reintentar, historial con búsqueda, exportación, valoración, estados de carga y error |
| Integración y especialización de IA | Cliente multiproveedor, System Prompt de cinco secciones con límites clínicos (sin diagnósticos, recetas ni dosis), alerta de urgencias, contexto, reintentos y errores tipificados, batería de 14 pruebas |
| Documentación y despliegue | Este README y `docs/`, `.env.example`, migraciones y scripts, guía para Supabase y Vercel |
| Innovación y creatividad | **Pastillero** con adherencia semanal, hoja imprimible y exportación a calendario; **detección de urgencias** con líneas de ayuda de Colombia; avisos destacados en las respuestas; lectura en voz alta y tamaño de texto ajustable; plantillas intercambiables y panel de evaluación con informe descargable |

## Solución de problemas

| Síntoma | Causa probable y solución |
|---|---|
| `Falta DATABASE_URL` / `ECONNREFUSED` | No existe `.env` o la base no está encendida: `npm run env:init` y `npm run db:up` |
| `ENOTFOUND` / `ETIMEDOUT` con Supabase desde tu PC | La conexión directa usa IPv6. Usa la cadena **Session pooler** (puerto 5432) para migraciones |
| `relation "users" does not exist` | Falta aplicar las migraciones: `npm run db:migrate` |
| Contraseña de la base con `@`, `#`, `/` o `:` | Debe ir codificada en la URL (URL-encode); el error dice «DATABASE_URL no es una URL válida» |
| «El asistente de IA aún no está configurado» | Falta `AI_API_KEY` (o `AI_BASE_URL` en `ollama` / `custom`). Ver **Administración → Pruebas** |
| «El modelo configurado no existe» | El proveedor retiró o renombró el modelo: define `AI_MODEL` o cámbialo en **Asistente → Modelo** |
| Muchos errores «demasiadas solicitudes» | Cuota del plan gratuito: espera, usa otro modelo o baja `CHAT_RATE_LIMIT_PER_MIN` |
| En Vercel la respuesta se corta | La función tiene `maxDuration = 60` s y `AI_TIMEOUT_MS = 50000`; un modelo más rápido o un tiempo menor lo resuelve |
| No puedo iniciar sesión tras cambiar `AUTH_SECRET` | Es esperado: las sesiones anteriores quedan inválidas; vuelve a iniciar sesión |
| Olvidé la contraseña del ADMIN | `ADMIN_RESET_PASSWORD=true` y `npm run db:seed` con la nueva `ADMIN_PASSWORD` |
| `npm audit` muestra avisos «moderate» | Son de herramientas de desarrollo (ESLint → `minimatch`), no se incluyen en la aplicación desplegada: `npm audit --omit=dev` informa 0 vulnerabilidades. No uses `npm audit fix --force`: instalaría una versión anterior de `eslint-config-next` |

> **Next.js 16:** el antiguo `middleware.ts` se llama ahora `proxy.ts` (es el archivo `src/proxy.ts`). Si usas una versión anterior de Next.js, renómbralo a `middleware.ts` y la función exportada a `middleware`.

## Lista de entrega

- [ ] Completar integrantes y enlaces al inicio de este archivo.
- [ ] Confirmar con el docente que **Salud y medicamentos** no la tiene otro equipo (el enunciado pide una especialidad distinta por equipo).
- [ ] Crear el repositorio en GitHub **sin** `.env` y dar acceso al docente.
- [ ] Crear el proyecto en Supabase y aplicar `npm run db:setup`.
- [ ] Desplegar en Vercel con las variables de entorno y probar la URL pública.
- [ ] Ejecutar la batería con el **modelo real** (`npm run eval`), completar la evaluación manual y guardar el informe en `docs/evidencia/`.
- [ ] Ensayar la demostración en vivo: registro/login, chat con historial, rol ADMIN (usuarios, asistente, estadísticas) y una pregunta fuera de especialidad.
