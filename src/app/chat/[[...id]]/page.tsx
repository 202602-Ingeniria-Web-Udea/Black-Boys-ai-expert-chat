import { notFound, redirect } from "next/navigation";
import { ChatShell } from "@/components/chat/ChatShell";
import { requireUser } from "@/lib/auth/session";
import { getOwnedConversation, listConversations } from "@/lib/db/conversations";
import { listMessages } from "@/lib/db/messages";
import { getAssistantSettings, toPublicAssistant } from "@/lib/db/settings";
import { isUuid } from "@/lib/ids";
import { plain } from "@/lib/serialize";

export const metadata = { title: "Chat" };
export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id?: string[] }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const [{ id }, { q }] = await Promise.all([params, searchParams]);
  const user = await requireUser(id?.length ? `/chat/${id.join("/")}` : "/chat");
  if (id && id.length > 1) notFound();

  const conversationId = id?.[0] ?? null;
  const [settings, conversations] = await Promise.all([getAssistantSettings(), listConversations(user.id)]);

  let messages: Awaited<ReturnType<typeof listMessages>> = [];
  if (conversationId) {
    // Una conversación que no existe o que pertenece a otra persona no se distingue: vuelve al chat nuevo.
    if (!isUuid(conversationId)) redirect("/chat");
    const owned = await getOwnedConversation(user.id, conversationId);
    if (!owned) redirect("/chat");
    messages = await listMessages(conversationId);
  }

  // /chat?q=… deja la pregunta escrita en un chat nuevo (nunca se envía sola)
  const rawDraft = Array.isArray(q) ? q[0] : q;
  const draft = conversationId || !rawDraft ? "" : rawDraft.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 500);

  return (
    <ChatShell
      user={user}
      assistant={toPublicAssistant(settings)}
      initialConversations={plain(conversations)}
      initialActiveId={conversationId}
      initialMessages={plain(messages)}
      initialDraft={draft}
    />
  );
}
