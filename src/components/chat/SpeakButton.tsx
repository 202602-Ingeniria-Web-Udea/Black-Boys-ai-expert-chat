"use client";

import { Square, Volume2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/components/ui/cn";

const noopSubscribe = () => () => {};

/** Convierte Markdown en texto corrido para que la voz no lea símbolos. */
export function markdownToSpeech(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\*\*|__|\*|_/g, "")
    .replace(/\|/g, " ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lee la respuesta en voz alta con la voz del navegador (si el navegador la ofrece). */
export function SpeakButton({ text, className }: { text: string; className?: string }) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined",
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);

  // Si la persona se va de la conversación mientras suena, se calla.
  useEffect(() => {
    return () => {
      if (speaking && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [speaking]);

  if (!supported) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(markdownToSpeech(text));
    utterance.lang = "es-CO";
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utterance);
  }

  const label = speaking ? "Detener la lectura" : "Leer la respuesta en voz alta";
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={speaking}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg transition-colors",
        speaking ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-ink",
        className,
      )}
    >
      {speaking ? <Square className="size-3.5 fill-current" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}
    </button>
  );
}
