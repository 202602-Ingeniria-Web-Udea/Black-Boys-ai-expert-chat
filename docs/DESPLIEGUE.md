# Guía de despliegue (Supabase + Vercel)

Pasos para publicar **Botiquín** (el asistente de salud y medicamentos del proyecto integrador *AI Expert Chat*) con una base de datos en **Supabase**, el código en **GitHub** y la aplicación en **Vercel**. Si solo quieres probarla en tu computador, basta con el [Inicio rápido del README](../README.md#inicio-rápido-local).

Los nombres de los menús de Supabase y Vercel pueden cambiar con el tiempo; si algo no coincide, busca la opción equivalente o consulta la documentación enlazada al final.

**Tiempo estimado:** 20–30 minutos. **Necesitas:** cuenta de GitHub, de Supabase, de Vercel y una clave de API de un proveedor de IA (Groq, Gemini u OpenAI). Para pruebas sin IA real puedes dejar `AI_PROVIDER=mock`.

## Resumen

```text
GitHub (código) ──▶ Vercel (aplicación) ──▶ Supabase (PostgreSQL)
                          │
                          └──▶ Proveedor de IA (clave solo en variables de entorno de Vercel)
```

1. [Subir el código a GitHub](#1-subir-el-código-a-github)
2. [Crear el proyecto en Supabase](#2-crear-el-proyecto-en-supabase)
3. [Crear las tablas y el administrador](#3-crear-las-tablas-y-el-administrador)
4. [Desplegar en Vercel](#4-desplegar-en-vercel)
5. [Verificar el despliegue](#5-verificar-el-despliegue)
6. [Generar la evidencia con el modelo real](#6-generar-la-evidencia-con-el-modelo-real)
7. [Ollama (modelo propio)](#7-ollama-modelo-propio)
8. [Problemas frecuentes](#8-problemas-frecuentes)

## 1. Subir el código a GitHub

1. Crea un repositorio vacío en GitHub (privado o público).
2. Desde la carpeta del proyecto:

   ```bash
   git init
   git add .
   git status        # comprueba que NO aparezcan .env, .env.local ni node_modules
   git commit -m "Botiquín: versión inicial"
   git branch -M main
   git remote add origin https://github.com/<usuario>/<repositorio>.git
   git push -u origin main
   ```

3. **Acceso del docente:** si el repositorio es privado, entra a *Settings → Collaborators* (o *Collaborators and teams*) y agrega a la persona indicada por el docente. Si es público, basta con compartir el enlace.

> El archivo `.gitignore` ya excluye `.env` y `.env.*` (menos `.env.example`). Nunca subas contraseñas ni claves de API: el enunciado lo exige y, además, un repositorio público es rastreado por bots que roban claves en minutos. Si una clave llegó a subirse, **revócala y crea otra**; borrarla del historial no basta.

## 2. Crear el proyecto en Supabase

1. En el panel de Supabase crea un proyecto nuevo. Elige:
   - **Nombre** cualquiera.
   - **Contraseña de la base de datos**: guárdala. Para evitar problemas, usa solo letras y números (si lleva caracteres especiales hay que codificarlos, ver más abajo).
   - **Región** cercana a la región de las funciones de tu proyecto en Vercel (*Settings → Functions*): la distancia entre ambos se nota en cada mensaje.
2. Espera a que el proyecto termine de crearse.
3. Pulsa **Connect** en la parte superior del proyecto y copia dos cadenas de conexión:

   | Para qué | Cadena | Puerto | Usuario |
   |---|---|---|---|
   | Crear tablas y administrador **desde tu PC** | *Session pooler* | `5432` | `postgres.<ref>` |
   | **Producción en Vercel** (`DATABASE_URL`) | *Transaction pooler* | `6543` | `postgres.<ref>` |

   Ambas tienen la forma `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-<n>-<región>.pooler.supabase.com:<puerto>/postgres`. **Copia el host exacto desde «Connect»**: el número y la región cambian de un proyecto a otro y no se pueden deducir.

   - La *Session pooler* funciona con IPv4, que es lo habitual en redes domésticas y universitarias. La conexión directa (`db.<ref>.supabase.co`) usa IPv6 y falla en muchas redes (`ENOTFOUND` o `ENETUNREACH`).
   - La *Transaction pooler* está pensada para funciones *serverless* como las de Vercel, que abren muchas conexiones cortas. La aplicación es compatible: usa consultas parametrizadas sin sentencias preparadas con nombre, que es lo que ese modo no soporta.

4. **Reemplaza `[YOUR-PASSWORD]`** por tu contraseña. Si tiene caracteres especiales, codifícalos en la URL:

   | Carácter | `@` | `#` | `/` | `:` | `?` | `%` | `&` | espacio |
   |---|---|---|---|---|---|---|---|---|
   | Código | `%40` | `%23` | `%2F` | `%3A` | `%3F` | `%25` | `%26` | `%20` |

> En el plan gratuito, Supabase **pausa los proyectos con poca actividad durante 7 días**. Si al abrir la aplicación la base no responde, entra al panel de Supabase y pulsa *Restore project* / *Resume project*; los datos se conservan. Conviene usar la aplicación (o la prueba de humo) un par de días antes de la sustentación.

## 3. Crear las tablas y el administrador

Esta parte se hace **una sola vez, desde tu computador**, apuntando a la base de Supabase. Necesitas haber hecho `npm install` en el proyecto.

La contraseña del administrador debe tener entre 8 y 72 caracteres, con letras y números. Pon `SEED_DEMO_USER=false` para que **no** se cree el usuario de demostración en producción.

**macOS / Linux / Git Bash**

```bash
DATABASE_URL="postgresql://postgres.<ref>:<clave>@aws-<n>-<región>.pooler.supabase.com:5432/postgres" \
ADMIN_EMAIL="tu-correo@dominio.com" \
ADMIN_PASSWORD="UnaClaveLarga2026" \
SEED_DEMO_USER=false \
npm run db:setup
```

**Windows (PowerShell)**

```powershell
$env:DATABASE_URL = "postgresql://postgres.<ref>:<clave>@aws-<n>-<región>.pooler.supabase.com:5432/postgres"
$env:ADMIN_EMAIL = "tu-correo@dominio.com"
$env:ADMIN_PASSWORD = "UnaClaveLarga2026"
$env:SEED_DEMO_USER = "false"
npm run db:setup
```

(En PowerShell las variables duran lo que dure la ventana; ciérrala al terminar.)

`npm run db:setup` aplica la migración [`db/migrations/0001_init.sql`](../db/migrations/0001_init.sql) y crea la cuenta ADMIN. Es **idempotente**: puedes repetirlo sin duplicar nada; si el administrador ya existe conserva su contraseña (usa `ADMIN_RESET_PASSWORD=true` para cambiarla).

> **La especialidad no se define aquí.** El asistente se crea la primera vez que la aplicación lo necesita (por ejemplo, cuando alguien abre la página de inicio), con la plantilla indicada por `ASSISTANT_PRESET` **del entorno donde corre la aplicación**, es decir, Vercel. Define esa variable en el paso 4 *antes* del primer acceso. Si ya arrancó con otra plantilla, cambia la variable, haz *Redeploy* y pulsa **Administración → Asistente → Restablecer**, o usa **Cargar plantilla** y guarda. Ver [`PLANTILLAS_ESPECIALIDAD.md`](PLANTILLAS_ESPECIALIDAD.md).

**Alternativa sin terminal**

1. En Supabase abre *SQL Editor*, crea una consulta nueva, pega **todo** el contenido de `db/migrations/0001_init.sql` y ejecútala.
2. Abre la aplicación desplegada, **regístrate** y vuelve al SQL Editor para promover tu cuenta:

   ```sql
   update users set role = 'ADMIN' where email = 'tu-correo@dominio.com';
   ```

3. Cierra la sesión y vuelve a iniciar sesión.

## 4. Desplegar en Vercel

1. En el panel de Vercel crea un proyecto nuevo (**Add New… → Project**) e importa el repositorio de GitHub.
2. Vercel detecta Next.js automáticamente: deja el *Framework Preset*, el directorio raíz y los comandos de compilación como vienen.
3. Antes de pulsar **Deploy**, abre *Environment Variables* y agrega:

   | Variable | Valor | ¿Obligatoria? |
   |---|---|---|
   | `DATABASE_URL` | Cadena **Transaction pooler** (puerto `6543`) de Supabase | Sí |
   | `AUTH_SECRET` | Texto aleatorio de 32 caracteres o más (ver abajo) | Sí |
   | `AI_PROVIDER` | `groq`, `gemini`, `openai`, `ollama`, `custom` o `mock` | Sí (por defecto `mock`) |
   | `AI_API_KEY` | Clave del proveedor de IA | Si no es `mock` ni `ollama` |
   | `AI_MODEL` | Modelo a usar (si lo omites, el del proveedor; también se cambia desde el panel) | No |
   | `AI_BASE_URL` | Endpoint, solo para `ollama` o `custom` | Según proveedor |
   | `ASSISTANT_PRESET` | `salud` (por defecto), `programacion`, `deporte`, `mecanica`, `gastronomia` o `turismo` | No |

   Opcionales: `CHAT_RATE_LIMIT_PER_MIN`, `AI_TIMEOUT_MS`, `AI_MAX_RETRIES`, `AI_AUTO_TITLE`, `STATS_TIMEZONE`, `DATABASE_SSL` y `DATABASE_POOL_MAX` (todas descritas en el [README](../README.md#variables-de-entorno)). **No** hace falta definir `ADMIN_*` en Vercel: solo las usan los scripts que ejecutas desde tu computador.

   Para generar `AUTH_SECRET` (funciona en cualquier sistema con Node.js):

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Marca `DATABASE_URL`, `AUTH_SECRET` y `AI_API_KEY` como **Secret** (valores de solo escritura: quedan ocultos después de guardarlos). Puedes pegar varias variables a la vez desde un archivo `.env` con *Import .env*; revisa el tipo y los entornos de cada una antes de guardar.

4. Pulsa **Deploy**. Al terminar, Vercel muestra la URL pública (`https://<proyecto>.vercel.app`).

> **Los cambios de variables solo se aplican a despliegues nuevos.** Si cambias una variable, haz un *Redeploy* del último despliegue. Cambiar `AUTH_SECRET` cierra todas las sesiones abiertas.

**Duración de las funciones.** Las rutas del chat y de las pruebas declaran `maxDuration = 60` (segundos) y esperan al modelo como máximo `AI_TIMEOUT_MS` = 50 s, así que el error llega a la persona antes de que Vercel corte la función. Con *Fluid compute* (activado por defecto) el plan gratuito admite hasta 300 s; si usas un modelo lento puedes subir `maxDuration` en `src/app/api/conversations/[id]/messages/route.ts` y `AI_TIMEOUT_MS` en las variables, manteniendo el segundo menor que el primero.

## 5. Verificar el despliegue

1. Abre `https://<tu-app>.vercel.app/api/health`. Debe responder algo así (los datos de IA cambian según tu proveedor):

   ```json
   { "status": "ok", "db": true, "ai": { "provider": "groq", "configured": true, "mock": false }, "time": "…" }
   ```

   Si `db` es `false` o `configured` es `false`, ve a [Problemas frecuentes](#8-problemas-frecuentes).
2. Inicia sesión con la cuenta ADMIN del paso 3 y revisa **Administración → Resumen**.
3. Crea una conversación y haz una pregunta de la especialidad (por ejemplo, para qué sirve un medicamento común); luego una fuera de ella y una que pida un diagnóstico o una dosis, que el asistente debe negarse a dar. Escribe también un mensaje de urgencia (por ejemplo, «Tengo un dolor fuerte en el pecho desde hace una hora») y comprueba que aparece el aviso con la línea 123 y las demás líneas de ayuda.
4. Abre **Pastillero** y crea un recordatorio de prueba (vive en tu navegador, no en la base de datos).
5. En **Administración → Pruebas** ejecuta la batería (próximo apartado).
6. Registra una cuenta nueva en otra ventana y comprueba que **no** puede abrir `/admin` ni ver conversaciones ajenas.

La prueba de humo automática (`npm run smoke -- https://<tu-app>.vercel.app`) también puede apuntar a la URL pública, pero **crea usuarios temporales** (`…@smoke.test`): con `ADMIN_EMAIL` y `ADMIN_PASSWORD` definidos los elimina al terminar; sin ellos la cuenta temporal queda en la base y tendrías que borrarla desde **Administración → Usuarios**. Ver [`PRUEBAS.md`](PRUEBAS.md).

## 6. Generar la evidencia con el modelo real

El enunciado pide evidencia de pruebas y una demostración en vivo. Con la aplicación publicada y `AI_PROVIDER` real:

```bash
ADMIN_EMAIL="tu-correo@dominio.com" ADMIN_PASSWORD="UnaClaveLarga2026" \
npm run eval -- https://<tu-app>.vercel.app --out docs/evidencia/informe-pruebas-real.md
```

(En PowerShell, define `$env:ADMIN_EMAIL` y `$env:ADMIN_PASSWORD` antes y ejecuta solo la segunda línea.) El informe queda en `docs/evidencia/`; completa a mano las columnas Pertinente / Coherente / Seguro y súbelo al repositorio. Detalles en [`PRUEBAS.md`](PRUEBAS.md).

## 7. Ollama (modelo propio)

Vercel no puede llegar a `localhost`, así que un Ollama instalado en tu computador solo sirve para **ejecutar la aplicación localmente**. Para desplegar con Ollama necesitas un servidor accesible desde internet (una máquina virtual o un equipo con IP pública) donde esté corriendo Ollama detrás de HTTPS, idealmente con una clave de acceso:

```text
AI_PROVIDER=ollama
AI_BASE_URL=https://tu-servidor.ejemplo.com/v1
AI_MODEL=llama3.2
AI_API_KEY=<clave que valide tu proxy>   # se envía como «Authorization: Bearer» (opcional)
```

Un modelo local suele ser más lento que uno alojado: si las respuestas se cortan, revisa `AI_TIMEOUT_MS` y `maxDuration` como se explica en el paso 4.

## 8. Problemas frecuentes

| Síntoma | Causa probable y solución |
|---|---|
| `/api/health` responde `"db": false` | Revisa `DATABASE_URL`: cadena **Transaction pooler**, usuario `postgres.<ref>`, host copiado de *Connect*, contraseña codificada. Comprueba también que el proyecto de Supabase no esté pausado |
| `Tenant or user not found` | En las cadenas del *pooler* el usuario es `postgres.<ref>` (no solo `postgres`) y el host debe ser el de tu proyecto |
| `password authentication failed` | Contraseña incorrecta. Puedes restablecerla en los ajustes de base de datos de Supabase y actualizar la cadena |
| `ENOTFOUND db.<ref>.supabase.co` o `ENETUNREACH` | Estás usando la conexión directa (IPv6). Usa la cadena *Session pooler* (puerto 5432) |
| `relation "users" does not exist` | Las tablas no se crearon en esa base: repite el paso 3 con la misma cadena que usa Vercel (mismo proyecto de Supabase) |
| La página muestra «Configuración incompleta del servidor» | Falta `AUTH_SECRET` o tiene menos de 32 caracteres. Defínela y haz *Redeploy* |
| «El asistente de IA aún no está configurado» | Falta `AI_API_KEY` o `AI_BASE_URL`. Revisa **Administración → Pruebas**: muestra qué falta |
| «El modelo configurado no existe» | El proveedor renombró o retiró el modelo. Define `AI_MODEL` o cámbialo en **Administración → Asistente → Modelo** |
| «Demasiadas solicitudes» | Cuota del plan gratuito del proveedor: espera unos segundos o usa otro modelo |
| La respuesta se corta o dice «tardó demasiado» | Modelo lento: sube `AI_TIMEOUT_MS` y `maxDuration` (paso 4) o elige un modelo más rápido |
| Cambié una variable y no pasa nada | Las variables se aplican a despliegues nuevos: haz *Redeploy* |
| No puedo iniciar sesión después de cambiar `AUTH_SECRET` | Es lo esperado: las sesiones anteriores dejan de valer. Inicia sesión de nuevo |
| Olvidé la contraseña del ADMIN | Repite el paso 3 con `ADMIN_RESET_PASSWORD=true` y la nueva `ADMIN_PASSWORD` |

## Fuentes

- [Supabase — Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres): cadenas de conexión, *poolers*, puertos, formato de usuario y IPv4/IPv6.
- [Supabase — Project pausing](https://supabase.com/docs/guides/platform/pausing): pausa automática de proyectos gratuitos.
- [Vercel — Configuring maximum duration](https://vercel.com/docs/functions/configuring-functions/duration): `maxDuration` y límites con *Fluid compute*.
- [Vercel — Environment variables](https://vercel.com/docs/environment-variables): variables por entorno, tipos Config/Secret y *redeploy*.
