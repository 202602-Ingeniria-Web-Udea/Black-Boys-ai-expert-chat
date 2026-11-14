import { NextResponse } from "next/server";
import { burnPasswordCheck, verifyPassword } from "@/lib/auth/password";
import { startSession, toSessionUser } from "@/lib/auth/session";
import { findUserByEmail, recordLoginFailure, recordLoginSuccess } from "@/lib/db/users";
import { HttpError } from "@/lib/errors";
import { assertSameOrigin, isSecureRequest, parseBody, route } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const INVALID = () => new HttpError(401, "INVALID_CREDENTIALS", "Correo o contraseña incorrectos.");

function lockedError(until: Date) {
  const minutes = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
  return new HttpError(
    429,
    "ACCOUNT_LOCKED",
    `Demasiados intentos fallidos. Inténtalo de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.`,
  );
}

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const { email, password } = await parseBody(request, loginSchema);

  const user = await findUserByEmail(email);
  if (!user) {
    await burnPasswordCheck(password); // mismo costo de tiempo que un correo existente
    throw INVALID();
  }
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) throw lockedError(user.lockedUntil);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const state = await recordLoginFailure(user.id);
    if (state?.lockedUntil && state.lockedUntil.getTime() > Date.now()) throw lockedError(state.lockedUntil);
    throw INVALID();
  }
  if (!user.isActive) {
    throw new HttpError(403, "ACCOUNT_DISABLED", "Tu cuenta está desactivada. Contacta al administrador.");
  }

  await recordLoginSuccess(user.id);
  await startSession(user, isSecureRequest(request));
  return NextResponse.json({ user: toSessionUser(user) });
});
