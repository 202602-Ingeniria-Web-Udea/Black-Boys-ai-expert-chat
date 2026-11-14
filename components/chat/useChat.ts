"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, NETWORK_MESSAGE, api, errorMessage, isAbortError, redirectToLogin, toApiError } from "@/lib/client/api";
import { parseSSE } from "@/lib/sse";
import type { ConversationSummary, MessageDto } from "@/lib/types";

export interface StreamState {
  conversationId: string;
  text: string;
  /** waiting: esperando el primer fragmento · streaming: ya llega texto */
  phase: "waiting" | "streaming";
}

export interface ChatError {
  code: string;
  message: string;
  /** true si la pregunta ya quedó guardada y se puede pedir de nuevo la respuesta */
  canRetry: boolean;
}

type Notify = (message: string, kind: "success" | "error" | "info") => void;

interface Options {
  initialConversations: ConversationSummary[];
  initialActiveId: string | null;
  initialMessages: MessageDto[];
  notify: Notify;
}

interface MetaEvent {
  userMessage: MessageDto | null;
  title: string | null;
}
interface DeltaEvent {
  text: string;
}
interface DoneEvent {
  message: MessageDto;
}
interface TitleEvent {
  id: string;
  title: string;
}
interface ErrorEvent {
  code: string;
  message: string;
  partial: MessageDto | null;
}

let tempCounter = 0;
const nextTempId = () => `tmp-${Date.now().toString(36)}-${++tempCounter}`;
export const isTempId = (id: string) => id.startsWith("tmp-");

const CHAT_PATH = /^\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;
const SEARCH_DELAY_MS = 250;

function lastIndexWhere<T>(list: T[], test: (item: T) => boolean): number {
  for (let i = list.length - 1; i >= 0; i--) if (test(list[i])) return i;
  return -1;
}

/**
 * Estado y lógica del chat: lista de conversaciones, mensajes de la conversación activa y la
 * respuesta en streaming. La URL (/chat/<id>) se mantiene sincronizada sin recargar la página.
 */
export function useChat({ initialConversations, initialActiveId, initialMessages, notify }: Options) {
  const [conversations, setConversations] = useState(initialConversations);
  const [results, setResults] = useState<ConversationSummary[] | null>(null);
  const [search, setSearchState] = useState("");
  const [searching, setSearching] = useState(false);
  const [activeId, setActiveIdState] = useState<string | null>(initialActiveId);
  const [messages, setMessages] = useState<MessageDto[]>(initialMessages);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [stream, setStream] = useState<StreamState | null>(null);
  const [error, setError] = useState<ChatError | null>(null);
  const [busy, setBusy] = useState(false);

  const activeIdRef = useRef(initialActiveId);
  const messagesRef = useRef(initialMessages);
  const notifyRef = useRef(notify);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const loadSeq = useRef(0);
  const searchSeq = useRef(0);
  const searchTimer = useRef<number | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
    notifyRef.current = notify;
  });

  // ---------- URL ----------
  const setActive = useCallback((id: string | null, mode: "push" | "replace" | "none") => {
    activeIdRef.current = id;
    setActiveIdState(id);
    if (mode === "none") return;
    const url = id ? `/chat/${id}` : "/chat";
    if (window.location.pathname === url) return;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);

  // ---------- Conversaciones (lista) ----------
  const patchConversation = useCallback((id: string, patch: Partial<ConversationSummary>, bump = false) => {
    setConversations((list) => {
      const index = list.findIndex((c) => c.id === id);
      if (index === -1) return list;
      const updated = { ...list[index], ...patch };
      return bump ? [updated, ...list.slice(0, index), ...list.slice(index + 1)] : list.map((c) => (c.id === id ? updated : c));
    });
    setResults((list) => (list ? list.map((c) => (c.id === id ? { ...c, ...patch } : c)) : list));
  }, []);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    const q = value.trim();
    const seq = ++searchSeq.current;
    if (!q) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = window.setTimeout(async () => {
      try {
        const data = await api<{ conversations: ConversationSummary[] }>(`/api/conversations?q=${encodeURIComponent(q)}`);
        if (seq === searchSeq.current) setResults(data.conversations);
      } catch (err) {
        if (seq === searchSeq.current) notifyRef.current(errorMessage(err), "error");
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, SEARCH_DELAY_MS);
  }, []);

  const clearSearch = useCallback(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchSeq.current++;
    setSearchState("");
    setResults(null);
    setSearching(false);
  }, []);

  // ---------- Mensajes ----------
  /** Descarga los mensajes; devuelve null si mientras tanto el usuario cambió de conversación. */
  const fetchMessages = useCallback(async (id: string): Promise<MessageDto[] | null> => {
    const seq = ++loadSeq.current;
    const data = await api<{ messages: MessageDto[] }>(`/api/conversations/${id}`);
    if (seq !== loadSeq.current || activeIdRef.current !== id) return null;
    return data.messages;
  }, []);

  /** Sincroniza con el servidor sin mostrar «cargando» (p. ej. para obtener los ids reales de un parcial). */
  const resync = useCallback(
    async (id: string) => {
      if (activeIdRef.current !== id || busyRef.current) return;
      try {
        const fresh = await fetchMessages(id);
        if (fresh && !busyRef.current) setMessages((prev) => (fresh.length >= prev.length ? fresh : prev));
      } catch {
        /* silencioso: se conserva lo que ya está en pantalla */
      }
    },
    [fetchMessages],
  );

  const select = useCallback(
    async (id: string | null, mode: "push" | "replace" | "none" = "push") => {
      if (id === activeIdRef.current) return;
      abortRef.current?.abort();
      setStream(null);
      setError(null);
      setActive(id, mode);
      setMessages([]);
      if (!id) {
        loadSeq.current++;
        setLoadingMessages(false);
        return;
      }
      setLoadingMessages(true);
      try {
        const fresh = await fetchMessages(id);
        if (fresh) setMessages(fresh);
      } catch (err) {
        if (activeIdRef.current !== id) return;
        if (err instanceof ApiError && err.status === 404) {
          notifyRef.current("Esa conversación ya no existe.", "error");
          setConversations((list) => list.filter((c) => c.id !== id));
          setActive(null, "replace");
        } else {
          notifyRef.current(errorMessage(err), "error");
        }
      } finally {
        if (activeIdRef.current === id) setLoadingMessages(false);
      }
    },
    [fetchMessages, setActive],
  );

  // Botones «atrás/adelante» del navegador
  useEffect(() => {
    const onPopState = () => {
      const match = CHAT_PATH.exec(window.location.pathname);
      if (match) void select(match[1], "none");
      else if (window.location.pathname.startsWith("/chat")) void select(null, "none");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [select]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, []);

  // ---------- Envío con streaming ----------
  const runStream = useCallback(
    async (convId: string, body: { content: string } | { regenerate: true }): Promise<{ accepted: boolean }> => {
      const controller = new AbortController();
      abortRef.current = controller;
      setStream({ conversationId: convId, text: "", phase: "waiting" });

      let acc = "";
      let scheduled = false;
      let finished = false;
      let accepted = false;
      const stillActive = () => activeIdRef.current === convId;
      const flush = () => {
        scheduled = false;
        setStream((s) => (s && s.conversationId === convId ? { ...s, text: acc, phase: "streaming" } : s));
      };
      /** Conserva en pantalla lo que alcanzó a generarse (el servidor también lo guarda). */
      const keepPartial = () => {
        if (acc.trim() && stillActive()) {
          setMessages((list) => [
            ...list,
            {
              id: nextTempId(),
              conversationId: convId,
              role: "ASSISTANT",
              content: acc,
              model: null,
              latencyMs: null,
              feedback: null,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
        window.setTimeout(() => void resync(convId), 900);
      };

      try {
        let res: Response;
        try {
          res = await fetch(`/api/conversations/${convId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "same-origin",
            signal: controller.signal,
          });
        } catch (err) {
          if (isAbortError(err)) throw err;
          throw new ApiError(0, "NETWORK", NETWORK_MESSAGE);
        }
        if (!res.ok || !res.body) {
          if (res.status === 401) redirectToLogin();
          throw await toApiError(res);
        }
        accepted = true; // el servidor ya guardó la pregunta antes de abrir el stream

        for await (const evt of parseSSE(res.body)) {
          let data: unknown;
          try {
            data = JSON.parse(evt.data);
          } catch {
            continue;
          }
          if (evt.event === "meta") {
            const meta = data as MetaEvent;
            if (meta.userMessage) {
              const saved = meta.userMessage;
              setMessages((list) => {
                const index = lastIndexWhere(list, (m) => m.role === "USER" && isTempId(m.id));
                if (index === -1) return list;
                const copy = list.slice();
                copy[index] = saved;
                return copy;
              });
            }
            patchConversation(convId, { ...(meta.title ? { title: meta.title } : {}), updatedAt: new Date().toISOString() }, true);
          } else if (evt.event === "delta") {
            acc += (data as DeltaEvent).text;
            if (!scheduled) {
              scheduled = true;
              requestAnimationFrame(flush);
            }
          } else if (evt.event === "done") {
            finished = true;
            const done = data as DoneEvent;
            if (stillActive()) setMessages((list) => [...list, done.message]);
          } else if (evt.event === "title") {
            const t = data as TitleEvent;
            patchConversation(t.id, { title: t.title });
          } else if (evt.event === "error") {
            finished = true;
            const failure = data as ErrorEvent;
            if (stillActive()) {
              if (failure.partial) {
                const partial = failure.partial;
                setMessages((list) => [...list, partial]);
              }
              setError({ code: failure.code, message: failure.message, canRetry: true });
            }
          }
        }

        if (!finished && stillActive()) {
          keepPartial();
          setError({ code: "INTERRUPTED", message: "La respuesta se interrumpió antes de terminar. Puedes reintentar.", canRetry: true });
        }
        return { accepted: true };
      } catch (err) {
        if (isAbortError(err)) {
          keepPartial(); // el usuario detuvo la respuesta o cambió de conversación
          return { accepted: true };
        }
        if (accepted) {
          // La conexión se cayó a mitad de la respuesta
          if (stillActive()) {
            keepPartial();
            setError({ code: "INTERRUPTED", message: "Se perdió la conexión mientras llegaba la respuesta. Puedes reintentar.", canRetry: true });
          }
          return { accepted: true };
        }
        const failure = err instanceof ApiError ? err : new ApiError(0, "UNKNOWN", errorMessage(err));
        // El servidor no guardó la pregunta: se quita el mensaje provisional y se devuelve el texto al cuadro de escritura
        setMessages((list) => list.filter((m) => !(m.role === "USER" && isTempId(m.id))));
        setError({ code: failure.code, message: failure.message, canRetry: false });
        return { accepted: false };
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setStream((s) => (s && s.conversationId === convId ? null : s));
      }
    },
    [patchConversation, resync],
  );

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const content = text.trim();
      if (!content || busyRef.current) return false;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      try {
        let convId = activeIdRef.current;
        if (!convId) {
          const data = await api<{ conversation: ConversationSummary }>("/api/conversations", { method: "POST", body: {} });
          convId = data.conversation.id;
          clearSearch();
          setConversations((list) => [data.conversation, ...list.filter((c) => c.id !== data.conversation.id)]);
          setActive(convId, "push");
        }
        const optimistic: MessageDto = {
          id: nextTempId(),
          conversationId: convId,
          role: "USER",
          content,
          model: null,
          latencyMs: null,
          feedback: null,
          createdAt: new Date().toISOString(),
        };
        setMessages((list) => [...list, optimistic]);
        const { accepted } = await runStream(convId, { content });
        return accepted;
      } catch (err) {
        setError({ code: err instanceof ApiError ? err.code : "UNKNOWN", message: errorMessage(err), canRetry: false });
        return false;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [clearSearch, runStream, setActive],
  );

  /** Vuelve a generar la última respuesta (o responde la última pregunta si quedó sin respuesta). */
  const regenerate = useCallback(async () => {
    const convId = activeIdRef.current;
    const list = messagesRef.current;
    if (!convId || list.length === 0 || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      if (list[list.length - 1].role === "ASSISTANT") setMessages((l) => l.slice(0, -1));
      const { accepted } = await runStream(convId, { regenerate: true });
      if (!accepted) await resync(convId);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [resync, runStream]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  const setFeedback = useCallback(async (messageId: string, value: 1 | -1 | 0) => {
    const previous = messagesRef.current.find((m) => m.id === messageId)?.feedback ?? null;
    const apply = (feedback: 1 | -1 | null) =>
      setMessages((list) => list.map((m) => (m.id === messageId ? { ...m, feedback } : m)));
    apply(value === 0 ? null : value);
    try {
      await api(`/api/messages/${messageId}/feedback`, { method: "PATCH", body: { value } });
    } catch (err) {
      apply(previous);
      notifyRef.current(errorMessage(err), "error");
    }
  }, []);

  /** Renombra; si falla lanza el error para que el diálogo lo muestre. */
  const rename = useCallback(
    async (id: string, title: string) => {
      const data = await api<{ conversation: { id: string; title: string } }>(`/api/conversations/${id}`, {
        method: "PATCH",
        body: { title },
      });
      patchConversation(id, { title: data.conversation.title });
    },
    [patchConversation],
  );

  const remove = useCallback(
    async (id: string) => {
      await api(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations((list) => list.filter((c) => c.id !== id));
      setResults((list) => (list ? list.filter((c) => c.id !== id) : list));
      if (activeIdRef.current === id) {
        abortRef.current?.abort();
        setStream(null);
        setError(null);
        setMessages([]);
        setActive(null, "replace");
      }
    },
    [setActive],
  );

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  return {
    conversations,
    results,
    search,
    setSearch,
    clearSearch,
    searching,
    activeId,
    activeConversation,
    messages,
    loadingMessages,
    stream,
    error,
    busy,
    select,
    send,
    stop,
    regenerate,
    dismissError,
    setFeedback,
    rename,
    remove,
  };
}
