import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { findUserById, type UserRecord } from "@/lib/db/users";
import type { SessionUser } from "@/lib/types";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./jwt";

export function toSessionUser(user: Pick<UserRecord, "id" | "name" | "email" | "role">): SessionUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/**
 * Usuario autenticado de la petición actual (o null).
 * El JWT solo identifica al usuario; el rol, el estado y la versión de sesión se leen SIEMPRE de la
 * base de datos, así un cambio de rol o una desactivación se aplican de inmediato.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifySession(token);
  if (!claims) return null;
  const user = await findUserById(claims.sub);
  if (!user || !user.isActive || user.tokenVersion !== claims.tv) return null;
  return toSessionUser(user);
});

/** Crea la sesión: cookie httpOnly firmada (JWT). */
export async function startSession(
  user: Pick<UserRecord, "id" | "role" | "tokenVersion">,
  secure: boolean,
): Promise<void> {
  const token = await signSession({ sub: user.id, role: user.role, tv: user.tokenVersion });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Para páginas del servidor: exige sesión y, si no hay, redirige al login. */
export async function requireUser(nextPath = "/chat"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Para páginas del servidor: exige rol ADMIN (los demás vuelven al chat). */
export async function requireAdmin(nextPath = "/admin"): Promise<SessionUser> {
  const user = await requireUser(nextPath);
  if (user.role !== "ADMIN") redirect("/chat");
  return user;
}
