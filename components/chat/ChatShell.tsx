"use client";

import { Download, LifeBuoy, Menu, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { downloadText } from "@/lib/client/api";
import { conversationToMarkdown, fileSlug } from "@/lib/client/export";
import type { ConversationSummary, MessageDto, PublicAssistant, SessionUser } from "@/lib/types";
import { Composer, type ComposerHandle } from "./Composer";
import { DeleteDialog, RenameDialog } from "./ConversationDialogs";
import { EmptyState } from "./EmptyState";
import { HelpPanel } from "./HelpPanel";
import { MessageList } from "./MessageList";
import { Sidebar } from "./Sidebar";
import { useChat } from "./useChat";

interface ChatShellProps {
  user: SessionUser;
  assistant: PublicAssistant;
  initialConversations: ConversationSummary[];
  initialActiveId: string | null;
  initialMessages: MessageDto[];
  /** Pregunta que llega por /chat?q=… para dejarla escrita (no se envía sola). */
  initialDraft?: string;
}

export function ChatShell({ user, assistant, initialConversations, initialActiveId, initialMessages, initialDraft = "" }: ChatShellProps) {
  const { toast } = useToast();
  const chat = useChat({ initialConversations, initialActiveId, initialMessages, notify: toast });
  const { select, send, stop, regenerate, setFeedback, rename, remove, dismissError, setSearch, clearSearch } = chat;

  const composerRef = useRef<ComposerHandle>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [renaming, setRenaming] = useState<ConversationSummary | null>(null);
  const [deleting, setDeleting] = useState<ConversationSummary | null>(null);

  const list = chat.results ?? chat.conversations;
  const title = chat.activeConversation?.title ?? (chat.messages.length > 0 ? "Conversación" : "Nueva conversación");

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const handleSelect = useCallback(
    (id: string) => {
      setDrawerOpen(false);
      void select(id);
    },
    [select],
  );

  const handleNew = useCallback(() => {
    setDrawerOpen(false);
    void select(null);
    composerRef.current?.focus();
  }, [select]);

  const handleExport = useCallback(() => {
    const markdown = conversationToMarkdown({
      title,
      assistantName: assistant.name,
      userName: user.name,
      messages: chat.messages,
    });
    downloadText(`${fileSlug(title)}.md`, markdown);
  }, [assistant.name, chat.messages, title, user.name]);

  const sidebarProps = {
    user,
    assistantName: assistant.name,
    conversations: list,
    isSearch: chat.results !== null,
    search: chat.search,
    searching: chat.searching,
    activeId: chat.activeId,
    onSearch: setSearch,
    onClearSearch: clearSearch,
    onSelect: handleSelect,
    onNew: handleNew,
    onRename: setRenaming,
    onDelete: setDeleting,
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-white">
      <aside className="hidden w-72 shrink-0 border-r border-line md:block" aria-label="Conversaciones">
        <Sidebar {...sidebarProps} />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Conversaciones">
          <div className="absolute inset-0 animate-fade bg-ink/40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-xs animate-drawer border-r border-line shadow-xl">
            <Sidebar {...sidebarProps} onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-1.5 border-b border-line px-2 sm:gap-2 sm:px-5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex size-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Abrir menú de conversaciones"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold tracking-tight text-ink">{title}</h1>
            <p className="truncate text-xs text-slate-600">
              {assistant.name} · {assistant.specialty}
            </p>
          </div>
          {chat.messages.length > 0 ? (
            <button
              type="button"
              onClick={handleExport}
              className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-ink"
              title="Descargar la conversación en Markdown"
            >
              <Download className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Exportar</span>
              <span className="sr-only sm:hidden">Exportar conversación</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink hover:border-red-200 hover:bg-red-50"
            title="Ayuda inmediata, fuentes oficiales y tamaño del texto"
          >
            <LifeBuoy className="size-[18px] text-red-700" aria-hidden="true" />
            <span className="hidden sm:inline">Ayuda</span>
            <span className="sr-only sm:hidden">Ayuda inmediata y ajustes</span>
          </button>
          <button
            type="button"
            onClick={handleNew}
            className="flex size-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Nueva conversación"
          >
            <Plus className="size-5" />
          </button>
        </header>

        <MessageList
          conversationId={chat.activeId}
          messages={chat.messages}
          stream={chat.stream}
          error={chat.error}
          loading={chat.loadingMessages}
          busy={chat.busy}
          assistantName={assistant.name}
          empty={
            <EmptyState
              assistant={assistant}
              disabled={chat.busy}
              onPick={(question) => void send(question)}
              onDraft={(text) => composerRef.current?.setDraft(text)}
            />
          }
          onFeedback={setFeedback}
          onRegenerate={regenerate}
          onDismissError={dismissError}
        />

        <div className="shrink-0 px-3 pt-2 pb-3 sm:px-5 sm:pb-4">
          <Composer ref={composerRef} busy={chat.busy} assistantName={assistant.name} initialValue={initialDraft} onSend={send} onStop={stop} />
        </div>
      </main>

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} assistantName={assistant.name} />
      <RenameDialog conversation={renaming} onClose={() => setRenaming(null)} onSave={rename} />
      <DeleteDialog
        conversation={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async (id) => {
          await remove(id);
          toast("Conversación eliminada", "success");
        }}
      />
    </div>
  );
}
