import { authorize } from "@/lib/api";
import { buildContext } from "@/lib/ai/context";
import { AIError } from "@/lib/ai/errors";
import { getProvider, resolveModel } from "@/lib/ai/provider";
import { generateTitle, heuristicTitle } from "@/lib/ai/title";
import type { ChatTurn } from "@/lib/ai/types";
import { composeSystemPrompt } from "@/lib/assistant/prompt";
import { getOwnedConversation, setConversationTitle } from "@/lib/db/conversations";
import { countRecentUserMessages, deleteMessage, getLastMessage, insertMessage, recentMessages } from "@/lib/db/messages";
import { getAssistantSettings } from "@/lib/db/settings";
import { envBool, envInt } from "@/lib/env";
import { HttpError } from "@/lib/errors";
import { parseBody, parseId, route } from "@/lib/http";
import { detectUrgency } from "@/lib/safety/urgency";
import { encodeSSE } from "@/lib/sse";
import { sendMessageSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * Envía una pregunta y devuelve la respuesta del asistente en streaming (Server-Sent Events).
 *
 * Flujo:  navegador → esta ruta → proveedor/modelo de IA → esta ruta → navegador
 * La clave de la API vive solo en el servidor. Eventos emitidos:
 *   meta   → mensaje del usuario ya guardado (+ título provisional)
 *   delta  → fragmento de texto de la respuesta
 *   done   → mensaje del asistente ya guardado en la base de datos
 *   title  → título generado por el modelo (opcional)
 *   error  → { code, message, partial } si el proveedor falla
 *
 * Con { regenerate: true } vuelve a generar la última respuesta (o responde la última pregunta).
 */
export const POST = route(async (request: Request, ctx: Ctx) => {
  const user = await authorize(request);
  const id = parseId((await ctx.params).id);
  const input = await parseBody(request, sendMessageSchema);

  const conversation = await getOwnedConversation(user.id, id);
  if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversación no encontrada.");

  // Límite de ritmo por usuario (protege la cuota del proveedor de IA)
  const perMinute = envInt("CHAT_RATE_LIMIT_PER_MIN", 15, 1, 600);
  if ((await countRecentUserMessages(user.id, 60)) >= perMinute) {
    throw new HttpError(429, "RATE_LIMITED", "Estás enviando mensajes muy rápido. Espera unos segundos e inténtalo de nuevo.");
  }

  const settings = await getAssistantSettings();
  const provider = getProvider(); // si falta la configuración → error JSON antes de abrir el stream
  const model = resolveModel(provider, settings.model);

  // 1) Persistir la pregunta (o preparar la regeneración)
  let userMessage = null;
  if (input.regenerate) {
    const last = await getLastMessage(id);
    if (!last) throw new HttpError(400, "NOTHING_TO_REGENERATE", "No hay ninguna pregunta que responder.");
    if (last.role === "ASSISTANT") await deleteMessage(last.id);
  } else {
    userMessage = await insertMessage({ conversationId: id, role: "USER", content: (input.content ?? "").trimEnd() });
  }

  // 2) Contexto conversacional (memoria de la conversación)
  const history = await recentMessages(id, settings.contextMessages);
  if (history.length === 0 || history[history.length - 1].role !== "USER") {
    throw new HttpError(400, "NOTHING_TO_REGENERATE", "No hay ninguna pregunta que responder.");
  }
  // Red de seguridad: si lo último que escribió la persona sugiere una urgencia (sobredosis, intoxicación,
  // emergencia médica o crisis emocional), el modelo recibe una alerta que le exige empezar por lo urgente.
  const lastUserText = history[history.length - 1].content;
  const urgency = detectUrgency(lastUserText);
  const turns: ChatTurn[] = [
    { role: "system", content: composeSystemPrompt(settings, new Date(), urgency) },
    ...buildContext(history, { maxMessages: settings.contextMessages }),
  ];

  // Título provisional en el primer intercambio
  const isFirstExchange = !input.regenerate && history.length === 1;
  let provisionalTitle: string | null = null;
  if (isFirstExchange && userMessage) {
    provisionalTitle = heuristicTitle(userMessage.content);
    await setConversationTitle(id, provisionalTitle);
  }

  // 3) Streaming hacia el navegador
  const encoder = new TextEncoder();
  const aborter = new AbortController();
  request.signal.addEventListener("abort", () => aborter.abort(), { once: true });
  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(encodeSSE(event, data)));
        } catch {
          /* el navegador cerró la conexión */
        }
      };
      let full = "";
      try {
        send("meta", { userMessage, title: provisionalTitle });
        for await (const piece of provider.stream(turns, {
          model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          signal: aborter.signal,
        })) {
          full += piece;
          send("delta", { text: piece });
        }
        const saved = await insertMessage({
          conversationId: id,
          role: "ASSISTANT",
          content: full,
          model,
          latencyMs: Date.now() - startedAt,
        });
        send("done", { message: saved });

        // Título generado por el modelo (después de entregar la respuesta; si falla se conserva el provisional)
        if (isFirstExchange && userMessage && !provider.id.startsWith("mock") && envBool("AI_AUTO_TITLE", true)) {
          const title = await generateTitle(provider, model, userMessage.content, full);
          if (title) {
            await setConversationTitle(id, title);
            send("title", { id, title });
          }
        }
      } catch (err) {
        const aiError = err instanceof AIError ? err : new AIError("UNKNOWN", err instanceof Error ? err.message : String(err));
        if (aiError.code !== "ABORTED") {
          console.error(`[chat] falla del proveedor (${provider.id}/${model}): ${aiError.code} ${aiError.detail ?? ""}`);
        }
        // Se conserva lo que alcanzó a generarse (el usuario ya lo vio en pantalla)
        let partial = null;
        if (full.trim()) {
          partial = await insertMessage({
            conversationId: id,
            role: "ASSISTANT",
            content: full,
            model,
            latencyMs: Date.now() - startedAt,
          }).catch(() => null);
        }
        if (aiError.code !== "ABORTED") send("error", { code: aiError.code, message: aiError.message, partial });
      } finally {
        try {
          controller.close();
        } catch {
          /* ya estaba cerrado */
        }
      }
    },
    cancel() {
      aborter.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
