import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { adminDeleteUser, adminUpdateUser } from "@/lib/db/users";
import { HttpError } from "@/lib/errors";
import { parseBody, parseId, route } from "@/lib/http";
import { adminUpdateUserSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const NOT_FOUND = () => new HttpError(404, "NOT_FOUND", "Usuario no encontrado.");

/** Cambiar rol, activar/desactivar o renombrar un usuario. Cierra sus sesiones si cambia rol o estado. */
export const PATCH = route(async (request: Request, ctx: Ctx) => {
  const admin = await authorize(request, { admin: true });
  const id = parseId((await ctx.params).id);
  const patch = await parseBody(request, adminUpdateUserSchema);
  const user = await adminUpdateUser(id, patch, admin.id);
  if (!user) throw NOT_FOUND();
  return NextResponse.json({ user });
});

export const DELETE = route(async (request: Request, ctx: Ctx) => {
  const admin = await authorize(request, { admin: true });
  const id = parseId((await ctx.params).id);
  if (!(await adminDeleteUser(id, admin.id))) throw NOT_FOUND();
  return NextResponse.json({ ok: true });
});
