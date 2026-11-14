import { FlaskConical, HeartPulse, Phone, Siren } from "lucide-react";
import { HELP_LINES, type HelpLine } from "@/lib/safety/resources";
import type { UrgencyKind } from "@/lib/safety/urgency";
import { cn } from "@/components/ui/cn";

interface Copy {
  title: string;
  text: string;
  lines: HelpLine["id"][];
  icon: typeof Siren;
}

const COPY: Record<UrgencyKind, Copy> = {
  poisoning: {
    title: "Puede ser una intoxicación: actúa ahora",
    text: "Llama a la línea de toxicología o al 123. No provoques el vómito ni des nada de beber o comer salvo que te lo indiquen. Ten a la mano el empaque del medicamento.",
    lines: ["poison", "emergency"],
    icon: FlaskConical,
  },
  crisis: {
    title: "No tienes que pasar por esto solo",
    text: "Llama a la Línea 106, que es gratuita, confidencial y atiende las 24 horas. Si estás en peligro, llama al 123. Si puedes, aleja los medicamentos y busca a alguien de confianza.",
    lines: ["mental-health", "emergency"],
    icon: HeartPulse,
  },
  emergency: {
    title: "Esto puede ser una emergencia",
    text: "Llama al 123 o ve a urgencias ahora. No esperes a que se pase ni busques primero la respuesta en el chat.",
    lines: ["emergency"],
    icon: Siren,
  },
};

/** Aviso de ayuda inmediata. Se muestra bajo el mensaje de la persona cuando el texto suena a urgencia. */
export function UrgencyBanner({
  kind,
  example = false,
  className,
}: {
  kind: UrgencyKind;
  /** true cuando solo ilustra la función (por ejemplo, en la portada): no se anuncia a lectores de pantalla como alerta. */
  example?: boolean;
  className?: string;
}) {
  const copy = COPY[kind];
  const Icon = copy.icon;
  return (
    <div
      role={example ? "group" : "alert"}
      aria-label={example ? "Ejemplo de aviso de ayuda inmediata" : undefined}
      className={cn("rounded-2xl border border-red-200 bg-red-50 p-4 text-ink", className)}
    >
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-red-800">{copy.title}</p>
          <p className="mt-1 text-[15px] leading-relaxed">{copy.text}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 sm:pl-[52px]">
        {copy.lines.map((id, index) => {
          const line = HELP_LINES[id];
          return (
            <a
              key={id}
              href={`tel:${line.tel}`}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-colors",
                index === 0 ? "bg-red-700 text-white hover:bg-red-800" : "border border-red-300 bg-white text-red-800 hover:bg-red-100",
              )}
            >
              <Phone className="size-4" aria-hidden="true" />
              {line.name}: {line.display}
            </a>
          );
        })}
      </div>
    </div>
  );
}
