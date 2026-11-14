import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { isUniqueViolation } from "@/lib/db/pool";
import { createUser, findUserByEmail, listUsersAdmin } from "@/lib/db/users";
import { HttpError } from "@/lib/errors";
import { parseBody, route } from "@/lib/http";
import { adminCreateUserSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await authorize(request, { admin: true });
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) || undefined;
  return NextResponse.json({ users: await listUsersAdmin({ search: q }) });
});

/** El ADMIN crea una cuenta (USER o ADMIN). */
export const POST = route(async (request: Request) => {
  await authorize(request, { admin: true });
  const input = await parseBody(request, adminCreateUserSchema);
  const taken = new HttpError(409, "EMAIL_TAKEN", "Ya existe una cuenta con ese correo.");
  if (await findUserByEmail(input.email)) throw taken;
  try {
    const user = await createUser({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
    });
    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          conversationCount: 0,
          messageCount: 0,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (isUniqueViolation(err)) throw taken;
    throw err;
  }
});
