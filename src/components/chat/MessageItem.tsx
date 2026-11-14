"use client";

import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { memo, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/site/Logo";
import { cn } from "@/components/ui/cn";
import { copyText } from "@/lib/client/api";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { MessageDto } from "@/lib/types";
import { Markdown } from "./Markdown";
import { SpeakButton } from "./SpeakButton";
import { isTempId } from "./useChat";

function ActionButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg transition-colors disabled:opacity-40",
        active ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

interface MessageItemProps {
  message: MessageDto;
  assistantName: string;
  isLast: boolean;
  busy: boolean;
  onFeedback: (id: string, value: 1 | -1 | 0) => void;
  onRegenerate: () => void;
}

export const MessageItem = memo(function MessageItem({ message, assistantName, isLast, busy, onFeedback, onRegenerate }: MessageItemProps) {
  const [copied, setCopied] = useState(false);

  if (message.role === "USER") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[88%] rounded-3xl rounded-br-lg bg-brand-50 px-5 py-3 leading-relaxed break-words whitespace-pre-wrap text-ink sm:max-w-[80%]"
          style={{ fontSize: "var(--chat-fs)" }}
          title={formatDateTime(message.createdAt)}
        >
          {message.content}
        </div>
      </div>
    );
  }

  const persisted = !isTempId(message.id);

  async function copy() {
    if (await copyText(message.content)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="flex gap-3">
      <LogoMark className="mt-0.5 size-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">{assistantName}</p>
        <div className="mt-1.5">
          <Markdown content={message.content} />
        </div>
        <div className="mt-2 -ml-2 flex flex-wrap items-center gap-0.5">
          <ActionButton label={copied ? "Copiado" : "Copiar respuesta"} onClick={copy}>
            {copied ? <Check className="size-4 text-brand-600" /> : <Copy className="size-4" />}
          </ActionButton>
          <SpeakButton text={message.content} />
          <ActionButton
            label="Respuesta útil"
            active={message.feedback === 1}
            disabled={!persisted}
            onClick={() => onFeedback(message.id, message.feedback === 1 ? 0 : 1)}
          >
            <ThumbsUp className="size-4" />
          </ActionButton>
          <ActionButton
            label="Respuesta no útil"
            active={message.feedback === -1}
            disabled={!persisted}
            onClick={() => onFeedback(message.id, message.feedback === -1 ? 0 : -1)}
          >
            <ThumbsDown className="size-4" />
          </ActionButton>
          {isLast ? (
            <ActionButton label="Generar otra respuesta" onClick={onRegenerate} disabled={busy}>
              <RotateCcw className="size-4" />
            </ActionButton>
          ) : null}
          {message.model || message.latencyMs ? (
            <span className="ml-2 flex items-center gap-3 text-xs text-slate-500">
              {message.model ? <span className="max-w-48 truncate">{message.model}</span> : null}
              {message.latencyMs ? <span>{formatDuration(message.latencyMs)}</span> : null}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
});
