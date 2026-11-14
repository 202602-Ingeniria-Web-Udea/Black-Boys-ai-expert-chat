import { jwtVerify, SignJWT } from "jose";
import { ConfigError } from "@/lib/errors";
import type { Role } from "@/lib/types";

export const SESSION_COOKIE = "aiec_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export interface SessionClaims {
  /** id del usuario */
  sub: string;
  /** rol al momento de iniciar sesión (solo para decisiones rápidas en el proxy) */
  role: Role;
  /** versión de tokens del usuario: si cambia en la BD, la sesión deja de ser válida */
  tv: number;
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new ConfigError(
      "AUTH_SECRET no está definido o tiene menos de 32 caracteres. Ejecuta `npm run env:init` o genera uno con `openssl rand -base64 32`.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role, tv: claims.tv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

/** Verifica firma y expiración. Devuelve null si el token no es válido. */
export async function verifySession(token: string): Promise<SessionClaims | null> {
  const key = secretKey(); // si falta AUTH_SECRET se informa en vez de tratarlo como "no autenticado"
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const { sub, role, tv } = payload as { sub?: string; role?: unknown; tv?: unknown };
    if (!sub || (role !== "ADMIN" && role !== "USER") || typeof tv !== "number") return null;
    return { sub, role, tv };
  } catch {
    return null;
  }
}
