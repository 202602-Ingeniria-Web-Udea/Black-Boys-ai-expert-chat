import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AIError, type AIErrorCode } from "@/lib/ai/errors";
import { ConfigError, HttpError } from "@/lib/errors";
import { isUuid } from "@/lib/ids";
import type { ApiErrorBody } from "@/lib/types";

const AI_STATUS: Record<AIErrorCode, number> = {
  CONFIG: 503,
  AUTH: 502,
  RATE_LIMIT: 429,
  TIMEOUT: 504,
  UNAVAILABLE: 503,
  MODEL_NOT_FOUND: 502,
  BAD_REQUEST: 502,
  EMPTY: 502,
  TOKEN_LIMIT: 502,
  ABORTED: 499,
  UNKNOWN: 502,
};

const DB_CONNECTION_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ECONNRESET",
  "57P01",
  "57P03",
  "08000",
  "08001",
  "08003",
  "08006",
  "28P01",
  "28000",
  "3D000",
]);

export function errorBody(code: string, message: string, details?: unknown): ApiErrorBody {
  return { error: { code, message, ...(details === undefined ? {} : { details }) } };
}

export function validationError(err: ZodError): HttpError {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in fields)) fields[key] = issue.message;
  }
  return new HttpError(400, "VALIDATION_ERROR", err.issues[0]?.message ?? "Datos inválidos", fields);
}

/** Traduce cualquier error a una respuesta JSON consistente { error: { code, message } }. */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json(errorBody(err.code, err.message, err.details), { status: err.status });
  }
  if (err instanceof ZodError) {
    const e = validationError(err);
    return NextResponse.json(errorBody(e.code, e.message, e.details), { status: e.status });
  }
  if (err instanceof AIError) {
    return NextResponse.json(errorBody(`AI_${err.code}`, err.message), { status: AI_STATUS[err.code] });
  }
  if (err instanceof ConfigError) {
    console.error("[config]", err.message);
    const message =
      process.env.NODE_ENV === "production"
        ? "El servidor no está configurado correctamente. Contacta al administrador."
        : err.message;
    return NextResponse.json(errorBody("CONFIG_ERROR", message), { status: 500 });
  }
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code === "string" && DB_CONNECTION_CODES.has(code)) {
    console.error("[db] no se pudo conectar:", code);
    return NextResponse.json(
      errorBody("DB_UNAVAILABLE", "No se pudo conectar con la base de datos. Inténtalo de nuevo en unos minutos."),
      { status: 503 },
    );
  }
  console.error("[api] error no controlado:", err);
  return NextResponse.json(errorBody("INTERNAL", "Ocurrió un error inesperado. Inténtalo de nuevo."), { status: 500 });
}

/** Envuelve un handler para que cualquier excepción se convierta en una respuesta de error JSON. */
export function route<C = unknown>(handler: (request: Request, ctx: C) => Promise<Response>) {
  return async (request: Request, ctx: C): Promise<Response> => {
    try {
      return await handler(request, ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/** Lee y valida el cuerpo JSON con un esquema Zod. */
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON", "El cuerpo de la solicitud no es JSON válido.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

/** Valida un identificador de ruta (UUID); si no es válido responde 404 sin tocar la BD. */
export function parseId(raw: string): string {
  if (!isUuid(raw)) throw new HttpError(404, "NOT_FOUND", "Recurso no encontrado.");
  return raw;
}

/**
 * Defensa CSRF adicional a SameSite=Lax: si el navegador envía la cabecera Origin en una petición que
 * modifica datos, debe coincidir con el host de la aplicación.
 */
export function assertSameOrigin(request: Request): void {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (!origin) return; // clientes que no son navegadores (curl, scripts)
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0]?.trim();
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    /* origen malformado */
  }
  if (!host || originHost !== host) {
    throw new HttpError(403, "BAD_ORIGIN", "Origen de la solicitud no permitido.");
  }
}

/** ¿La petición llegó por HTTPS? (decide el atributo Secure de la cookie de sesión). */
export function isSecureRequest(request: Request): boolean {
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto) return proto === "https";
  return new URL(request.url).protocol === "https:";
}
