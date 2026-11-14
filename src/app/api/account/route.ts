import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { toSessionUser } from "@/lib/auth/session";
import { updateUserName } from "@/lib/db/users";
import { HttpError } from "@/lib/errors";
import { parseBody, route } from "@/lib/http";
import { updateProfileSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** El usuario actualiza su propio nombre. */
export const PATCH = route(async (request: Request) => {
  const user = await authorize(request);
  const { name } = await parseBody(request, updateProfileSchema);
  const updated = await updateUserName(user.id, name);
  if (!updated) throw new HttpError(404, "NOT_FOUND", "Usuario no encontrado.");
  return NextResponse.json({ user: toSessionUser(updated) });
});
