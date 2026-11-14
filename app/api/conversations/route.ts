import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { createConversation, listConversations } from "@/lib/db/conversations";
import { parseBody, route } from "@/lib/http";
import { createConversationSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Historial: solo las conversaciones del usuario autenticado. Admite ?q= para buscar. */
export const GET = route(async (request: Request) => {
  const user = await authorize(request);
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) || undefined;
  return NextResponse.json({ conversations: await listConversations(user.id, q) });
});

export const POST = route(async (request: Request) => {
  const user = await authorize(request);
  const body = request.headers.get("content-length") === "0" ? {} : await parseBody(request, createConversationSchema);
  const conversation = await createConversation(user.id, body.title);
  return NextResponse.json({ conversation: { ...conversation, messageCount: 0 } }, { status: 201 });
});
