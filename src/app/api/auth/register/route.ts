import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { startSession, toSessionUser } from "@/lib/auth/session";
import { createUser, findUserByEmail, recordLoginSuccess } from "@/lib/db/users";
import { isUniqueViolation } from "@/lib/db/pool";
import { HttpError } from "@/lib/errors";
import { assertSameOrigin, isSecureRequest, parseBody, route } from "@/lib/http";
import { registerSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const EMAIL_TAKEN = new HttpError(409, "EMAIL_TAKEN", "Ya existe una cuenta con ese correo.");

/** Registro público. El rol siempre es USER: un ADMIN solo se crea con el seed o desde el panel. */
export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const input = await parseBody(request, registerSchema);

  if (await findUserByEmail(input.email)) throw EMAIL_TAKEN;
  const passwordHash = await hashPassword(input.password);
  let user;
  try {
    user = await createUser({ name: input.name, email: input.email, passwordHash, role: "USER" });
  } catch (err) {
    if (isUniqueViolation(err)) throw EMAIL_TAKEN;
    throw err;
  }
  await recordLoginSuccess(user.id); // el registro inicia sesión: cuenta como primer acceso
  await startSession(user, isSecureRequest(request));
  return NextResponse.json({ user: toSessionUser(user) }, { status: 201 });
});
