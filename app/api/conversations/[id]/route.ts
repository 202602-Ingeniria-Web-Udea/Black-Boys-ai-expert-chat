import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { deleteConversation, getOwnedConversation, renameConversation } from "@/lib/db/conversations";
import { listMessages } from "@/lib/db/messages";
import { HttpError } from "@/lib/errors";
import { parseBody, parseId, route } from "@/lib/http";
import { renameConversationSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const NOT_FOUND = () => new HttpError(404, "NOT_FOUND", "Conversación no encontrada.");

/** Conversación + mensajes. Si no es del usuario responde 404 (no revela que exista). */
export const GET = route(async (request: Request, ctx: Ctx) => {
  const user = await authorize(request);
  const id = parseId((await ctx.params).id);
  const conversation = await getOwnedConversation(user.id, id);
  if (!conversation) throw NOT_FOUND();
  return NextResponse.json({ conversation, messages: await listMessages(id) });
});

export const PATCH = route(async (request: Request, ctx: Ctx) => {
  const user = await authorize(request);
  const id = parseId((await ctx.params).id);
  const { title } = await parseBody(request, renameConversationSchema);
  const conversation = await renameConversation(user.id, id, title);
  if (!conversation) throw NOT_FOUND();
  return NextResponse.json({ conversation });
});

export const DELETE = route(async (request: Request, ctx: Ctx) => {
  const user = await authorize(request);
  const id = parseId((await ctx.params).id);
  if (!(await deleteConversation(user.id, id))) throw NOT_FOUND();
  return NextResponse.json({ ok: true });
});
