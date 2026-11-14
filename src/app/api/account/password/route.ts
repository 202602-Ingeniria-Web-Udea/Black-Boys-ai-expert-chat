import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { findUserById, updateUserPassword } from "@/lib/db/users";
import { HttpError } from "@/lib/errors";
import { isSecureRequest, parseBody, route } from "@/lib/http";
import { changePasswordSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Cambia la contraseña: cierra las demás sesiones (token_version + 1) y mantiene esta. */
export const POST = route(async (request: Request) => {
  const current = await authorize(request);
  const { currentPassword, newPassword } = await parseBody(request, changePasswordSchema);

  const user = await findUserById(current.id);
  if (!user) throw new HttpError(404, "NOT_FOUND", "Usuario no encontrado.");
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new HttpError(400, "WRONG_PASSWORD", "La contraseña actual no es correcta.");
  }
  if (currentPassword === newPassword) {
    throw new HttpError(400, "SAME_PASSWORD", "La nueva contraseña debe ser diferente a la actual.");
  }
  const updated = await updateUserPassword(user.id, await hashPassword(newPassword));
  if (!updated) throw new HttpError(404, "NOT_FOUND", "Usuario no encontrado.");
  await startSession(updated, isSecureRequest(request));
  return NextResponse.json({ ok: true });
});
