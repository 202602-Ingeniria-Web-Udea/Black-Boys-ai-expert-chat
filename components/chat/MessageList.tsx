"use client";

import { ArrowDown } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { UrgencyBanner } from "@/components/safety/UrgencyBanner";
import { LogoMark } from "@/components/site/Logo";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { detectUrgency } from "@/lib/safety/urgency";
import type { MessageDto } from "@/lib/types";
import { Markdown } from "./Markdown";
import { MessageItem } from "./MessageItem";
import type { ChatError, StreamState } from "./useChat";

interface MessageListProps {
  conversationId: string | null;
  messages: MessageDto[];
  stream: StreamState | null;
  error: ChatError | null;
  loading: boolean;
  busy: boolean;
  assistantName: string;
  empty: ReactNode;
  onFeedback: (id: string, value: 1 | -1 | 0) => void;
  onRegenerate: () => void;
  onDismissError: () => void;
}

function Skeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Cargando la conversación">
      <div className="flex justify-end">
        <div className="h-10 w-2/5 animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <div className="flex gap-3">
        <div className="size-8 shrink-0 animate-pulse rounded-lg bg-slate-100" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="h-3.5 w-11/12 animate-pulse rounded bg-slate-100" />
          <div className="h-3.5 w-4/5 animate-pulse rounded bg-slate-100" />
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function MessageList({
  conversationId,
  messages,
  stream,
  error,
  loading,
  busy,
  assistantName,
  empty,
  onFeedback,
  onRegenerate,
  onDismissError,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const hasContent = messages.length > 0 || stream !== null;

  // Al cambiar de conversación se vuelve a «pegar» el scroll al final
  useEffect(() => {
    stick.current = true;
  }, [conversationId]);

  // Mientras llega la respuesta, sigue el final salvo que la persona haya subido a leer.
  // La pantalla de inicio, en cambio, siempre se lee desde arriba.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!hasContent) {
      el.scrollTop = 0;
      return;
    }
    if (stick.current) el.scrollTop = el.scrollHeight;
  }, [conversationId, messages, stream?.text, stream?.phase, error, loading, hasContent]);

  function onScroll() {
    const el = scrollRef.current;
    // En la pantalla de inicio no hay nada que seguir: así la primera respuesta sí acompaña al final
    if (!el || !hasContent) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stick.current = distance < 80;
    setShowJump(distance > 240);
  }

  function jumpToEnd() {
    const el = scrollRef.current;
    if (!el) return;
    stick.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  const lastMessage = messages[messages.length - 1];

  // Si el último mensaje de la persona suena a urgencia, el aviso con los números de ayuda aparece de inmediato,
  // sin esperar a la respuesta del modelo (se calcula en el navegador con el mismo detector que usa el servidor).
  const urgent = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "USER") {
        const signal = detectUrgency(messages[i].content);
        return signal ? { id: messages[i].id, kind: signal.kind } : null;
      }
    }
    return null;
  }, [messages]);

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={onScroll} className="scroll-thin h-full overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
            <Skeleton />
          </div>
        ) : !hasContent ? (
          empty
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6">
            {messages.map((message) => (
              <Fragment key={message.id}>
                <MessageItem
                  message={message}
                  assistantName={assistantName}
                  isLast={message === lastMessage && message.role === "ASSISTANT" && !stream}
                  busy={busy}
                  onFeedback={onFeedback}
                  onRegenerate={onRegenerate}
                />
                {urgent && urgent.id === message.id ? <UrgencyBanner kind={urgent.kind} /> : null}
              </Fragment>
            ))}

            {stream ? (
              <div className="flex gap-3">
                <LogoMark className="mt-0.5 size-8 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{assistantName}</p>
                  <div className="mt-1.5">
                    {stream.text ? (
                      <Markdown content={stream.text} streaming />
                    ) : (
                      <span className="inline-flex items-center gap-3 text-sm text-slate-600" role="status">
                        <span className="typing-capsule" aria-hidden="true" />
                        {assistantName} está preparando la respuesta…
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {error ? (
              <Alert
                kind="error"
                action={
                  <div className="flex shrink-0 items-center gap-1">
                    {error.canRetry ? (
                      <Button size="sm" variant="secondary" onClick={onRegenerate} disabled={busy}>
                        Reintentar
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={onDismissError}>
                      Cerrar
                    </Button>
                  </div>
                }
              >
                {error.message}
              </Alert>
            ) : null}
          </div>
        )}
      </div>

      {showJump && hasContent ? (
        <button
          type="button"
          onClick={jumpToEnd}
          className="absolute bottom-3 left-1/2 flex size-10 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-white text-slate-600 shadow-md hover:text-ink"
          aria-label="Ir al final de la conversación"
        >
          <ArrowDown className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
