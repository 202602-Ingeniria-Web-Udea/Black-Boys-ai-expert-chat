import { FileText, HeartPulse, Pill } from "lucide-react";
import { CAPSULE_COLORS, CapsuleIcon } from "@/components/art/Capsule";
import { HelpLines } from "@/components/safety/HelpLines";
import { LogoMark } from "@/components/site/Logo";
import type { PublicAssistant } from "@/lib/types";

const STARTERS = [
  {
    icon: Pill,
    title: "Un medicamento",
    hint: "Para qué sirve y cómo usarlo con seguridad",
    draft: "Quiero entender para qué sirve y cómo se usa este medicamento: ",
  },
  {
    icon: FileText,
    title: "Un prospecto",
    hint: "Pega un fragmento y te lo explico",
    draft: "Ayúdame a entender este fragmento del prospecto: ",
  },
  {
    icon: HeartPulse,
    title: "Un hábito de salud",
    hint: "Sueño, alimentación, actividad física…",
    draft: "Quiero mejorar este hábito de salud: ",
  },
];

interface EmptyStateProps {
  assistant: PublicAssistant;
  disabled: boolean;
  /** Envía la pregunta tal cual. */
  onPick: (question: string) => void;
  /** Deja un comienzo de frase en el cuadro de escritura para que la persona lo complete. */
  onDraft: (text: string) => void;
}

export function EmptyState({ assistant, disabled, onPick, onDraft }: EmptyStateProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 py-8 sm:px-6">
      <div className="flex items-center gap-4">
        <LogoMark className="size-14 shrink-0" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{assistant.name}</h2>
          <p className="text-slate-600">Especialista en {assistant.specialty.toLowerCase()}</p>
        </div>
      </div>
      <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-slate-700">{assistant.welcomeMessage}</p>

      <div className="mt-7">
        <p className="text-sm font-bold text-ink">¿Sobre qué quieres hablar?</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {STARTERS.map(({ icon: Icon, title, hint, draft }) => (
            <li key={title}>
              <button
                type="button"
                onClick={() => onDraft(draft)}
                disabled={disabled}
                className="flex h-full w-full items-center gap-3 rounded-2xl border border-line p-3.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50 sm:flex-col sm:items-start sm:gap-1"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col sm:mt-1">
                  <span className="font-bold">{title}</span>
                  <span className="text-sm leading-snug text-slate-600">{hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {assistant.suggestedQuestions.length > 0 ? (
        <div className="mt-7">
          <p className="text-sm font-bold text-ink">O empieza con una de estas preguntas</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {assistant.suggestedQuestions.slice(0, 4).map((question, index) => (
              <li key={question}>
                <button
                  type="button"
                  onClick={() => onPick(question)}
                  disabled={disabled}
                  className="flex h-full w-full items-start gap-3 rounded-2xl border border-line px-4 py-2.5 text-left text-[15px] leading-snug text-slate-800 transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
                >
                  <CapsuleIcon color={CAPSULE_COLORS[index % CAPSULE_COLORS.length].id} className="size-7 shrink-0" />
                  <span>{question}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-7 flex flex-col gap-1.5 border-t border-line pt-4">
        <p className="text-sm text-slate-600">En una urgencia no esperes una respuesta del chat:</p>
        <HelpLines />
      </div>
    </div>
  );
}
