"use client";

import { ArrowUp, Square } from "lucide-react";
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { cn } from "@/components/ui/cn";
import { MAX_MESSAGE_CHARS } from "@/lib/validation";

export interface ComposerHandle {
  focus: () => void;
  /** Reemplaza el texto del cuadro, lo enfoca y deja el cursor al final. */
  setDraft: (text: string) => void;
}

interface ComposerProps {
  ref?: Ref<ComposerHandle>;
  busy: boolean;
  assistantName: string;
  /** Texto con el que arranca el cuadro (por ejemplo, una pregunta que llega por la dirección ?q=). */
  initialValue?: string;
  onSend: (text: string) => Promise<boolean>;
  onStop: () => void;
}

const MAX_HEIGHT = 200;

export function Composer({ ref, busy, assistantName, initialValue = "", onSend, onStop }: ComposerProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasBusy = useRef(false);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => textareaRef.current?.focus(),
      setDraft: (text: string) => {
        setValue(text);
        requestAnimationFrame(() => {
          const el = textareaRef.current;
          if (!el) return;
          el.focus();
          el.setSelectionRange(text.length, text.length);
        });
      },
    }),
    [],
  );

  // Una pregunta que llega prellenada se deja lista para revisar y enviar
  useEffect(() => {
    const el = textareaRef.current;
    if (el && initialValue) {
      el.focus();
      el.setSelectionRange(initialValue.length, initialValue.length);
    }
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ajusta la altura al contenido (hasta un máximo)
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  // En equipos con mouse se enfoca al entrar y al terminar una respuesta (en móvil no, para no abrir el teclado)
  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (finePointer && (!busy && (wasBusy.current || document.activeElement === document.body))) {
      textareaRef.current?.focus();
    }
    wasBusy.current = busy;
  }, [busy]);

  const length = value.length;
  const tooLong = length > MAX_MESSAGE_CHARS;
  const canSend = value.trim().length > 0 && !tooLong && !busy;

  async function submit() {
    if (!canSend) return;
    const text = value;
    setValue("");
    const accepted = await onSend(text);
    // Si el servidor no aceptó el mensaje, se devuelve el texto para no perderlo
    if (!accepted) setValue((current) => current || text);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div
        className={cn(
          "flex items-end gap-2 rounded-3xl border bg-white py-2 pr-2 pl-5 shadow-[0_8px_24px_-16px_rgba(13,43,51,0.35)] transition-colors focus-within:ring-4",
          tooLong
            ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-100"
            : "border-slate-300 focus-within:border-brand-600 focus-within:ring-brand-100",
        )}
      >
        <label htmlFor="composer" className="sr-only">
          Escribe tu pregunta para {assistantName}
        </label>
        <textarea
          id="composer"
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Escribe tu pregunta sobre un medicamento o un hábito"
          className="max-h-[200px] min-h-[28px] flex-1 resize-none bg-transparent py-1.5 leading-relaxed text-ink placeholder:text-slate-500 focus:outline-none"
          style={{ fontSize: "max(1rem, var(--chat-fs))" }}
          aria-describedby="composer-help"
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-white transition-colors hover:bg-slate-700"
            aria-label="Detener respuesta"
            title="Detener respuesta"
          >
            <Square className="size-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSend}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-500"
            aria-label="Enviar mensaje"
            title="Enviar (Enter)"
          >
            <ArrowUp className="size-5" />
          </button>
        )}
      </div>
      <div id="composer-help" className="mt-2 flex items-start justify-between gap-4 px-2 text-xs leading-snug text-slate-600">
        <p>
          Información educativa: no reemplaza a un profesional de la salud. Emergencias:{" "}
          <a href="tel:123" className="font-bold text-red-700 underline underline-offset-2">
            123
          </a>
          .
        </p>
        {length > MAX_MESSAGE_CHARS * 0.8 ? (
          <p className={cn("shrink-0 tabular-nums", tooLong && "font-semibold text-red-700")}>
            {length.toLocaleString("es-CO")} / {MAX_MESSAGE_CHARS.toLocaleString("es-CO")}
          </p>
        ) : (
          <p className="hidden shrink-0 sm:block">Enter envía · Shift + Enter, nueva línea</p>
        )}
      </div>
    </div>
  );
}
