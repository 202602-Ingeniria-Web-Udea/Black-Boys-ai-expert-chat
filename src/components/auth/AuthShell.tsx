import { Check, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { Logo, LogoMark } from "@/components/site/Logo";
import { CAPSULE_COLORS, CapsuleIcon } from "@/components/art/Capsule";
import { HELP_LINES } from "@/lib/safety/resources";
import type { PublicAssistant } from "@/lib/types";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  assistant: PublicAssistant;
}

/** Estructura común de login y registro: formulario a la izquierda, presentación del asistente a la derecha. */
export function AuthShell({ title, subtitle, children, footer, assistant }: AuthShellProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <main id="contenido" className="flex flex-col px-6 py-6 sm:px-10">
        <Logo name={assistant.name} />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-[30px] leading-tight font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-slate-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-sm text-slate-600">{footer}</p>
        </div>
      </main>

      <aside className="hidden bg-brand-50 lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20" aria-label={`Sobre ${assistant.name}`}>
        <div className="max-w-md">
          <div className="flex items-center gap-1" aria-hidden="true">
            {CAPSULE_COLORS.map((c) => (
              <CapsuleIcon key={c.id} color={c.id} className="size-10" />
            ))}
          </div>
          <h2 className="mt-6 text-3xl leading-tight font-bold tracking-tight">{assistant.name}</h2>
          <p className="mt-1 text-slate-700">Asistente especializado en {assistant.specialty.toLowerCase()}</p>

          <div className="mt-7 flex gap-3 rounded-3xl bg-white p-5 shadow-[0_18px_40px_-26px_rgba(0,66,50,0.45)]">
            <LogoMark className="size-8 shrink-0" />
            <p className="text-[15px] leading-relaxed text-slate-700">{assistant.welcomeMessage}</p>
          </div>

          <ul className="mt-8 space-y-3 text-[15px] text-slate-800">
            {[
              `Responde dentro de su especialidad: ${assistant.specialty.toLowerCase()}.`,
              "No diagnostica ni receta: te orienta y te dice cuándo consultar.",
              "Tu historial es privado: solo tú puedes verlo.",
            ].map((text) => (
              <li key={text} className="flex items-start gap-3">
                <Check className="mt-0.5 size-[18px] shrink-0 text-brand-700" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <p className="mt-10 flex items-center gap-2.5 text-sm text-slate-700">
            <Phone className="size-4 shrink-0 text-red-700" aria-hidden="true" />
            <span>
              ¿Es una urgencia? Llama al{" "}
              <a href={`tel:${HELP_LINES.emergency.tel}`} className="font-bold text-red-700 underline underline-offset-2">
                {HELP_LINES.emergency.display}
              </a>
              .
            </span>
          </p>
        </div>
      </aside>
    </div>
  );
}
