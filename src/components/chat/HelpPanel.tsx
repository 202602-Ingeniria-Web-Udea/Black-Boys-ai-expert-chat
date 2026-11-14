"use client";

import { ExternalLink } from "lucide-react";
import { HelpLines } from "@/components/safety/HelpLines";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/components/ui/cn";
import { TRUSTED_SOURCES } from "@/lib/safety/resources";
import { useTextSize, type TextSize } from "./useTextSize";

const SIZES: Array<{ value: TextSize; label: string; sample: string; sr: string }> = [
  { value: "md", label: "A", sample: "text-base", sr: "Normal" },
  { value: "lg", label: "A", sample: "text-xl", sr: "Grande" },
  { value: "xl", label: "A", sample: "text-3xl", sr: "Muy grande" },
];

/** Ayuda inmediata, fuentes oficiales y tamaño del texto. En el móvil se abre como hoja inferior. */
export function HelpPanel({ open, onClose, assistantName }: { open: boolean; onClose: () => void; assistantName: string }) {
  const [size, setSize] = useTextSize();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ayuda y ajustes"
      description={`${assistantName} no atiende emergencias. Si alguien está en riesgo, llama primero.`}
      size="md"
    >
      <div className="space-y-7">
        <section aria-labelledby="ayuda-inmediata">
          <h3 id="ayuda-inmediata" className="mb-3 text-sm font-bold text-ink">
            Ayuda inmediata en Colombia
          </h3>
          <HelpLines variant="list" />
        </section>

        <section aria-labelledby="fuentes">
          <h3 id="fuentes" className="mb-3 text-sm font-bold text-ink">
            Verifica en fuentes oficiales
          </h3>
          <ul className="space-y-2">
            {TRUSTED_SOURCES.map((source) => (
              <li key={source.href}>
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-line p-3.5 transition-colors hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="flex items-center justify-between gap-3 font-semibold text-ink">
                    {source.name}
                    <ExternalLink className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                    <span className="sr-only">(se abre en una pestaña nueva)</span>
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-slate-600">{source.description}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tamano">
          <h3 id="tamano" className="mb-3 text-sm font-bold text-ink">
            Tamaño del texto del chat
          </h3>
          <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="tamano">
            {SIZES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSize(option.value)}
                aria-pressed={size === option.value}
                className={cn(
                  "flex h-16 flex-col items-center justify-center rounded-2xl border-2 transition-colors",
                  size === option.value ? "border-brand-600 bg-brand-50 text-brand-800" : "border-line text-slate-700 hover:border-slate-300",
                )}
              >
                <span className={cn("leading-none font-bold", option.sample)} aria-hidden="true">
                  {option.label}
                </span>
                <span className="mt-1 text-xs font-medium">{option.sr}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
