import { getCurrentUser } from "@/lib/auth/session";
import { HttpError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/http";
import type { SessionUser } from "@/lib/types";

/**
 * Autorización en el BACKEND para todos los endpoints protegidos.
 *  1. Verifica el origen (CSRF) en peticiones que modifican datos.
 *  2. Exige sesión válida (JWT + usuario activo en la base de datos).
 *  3. Si `admin: true`, exige además que el usuario tenga rol ADMIN en la base de datos.
 */
export async function authorize(request: Request, opts: { admin?: boolean } = {}): Promise<SessionUser> {
  assertSameOrigin(request);
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Debes iniciar sesión para continuar.");
  if (opts.admin && user.role !== "ADMIN") {
    throw new HttpError(403, "FORBIDDEN", "No tienes permisos para realizar esta acción.");
  }
  return user;
}
