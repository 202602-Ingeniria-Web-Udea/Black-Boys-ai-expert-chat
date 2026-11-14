import { FlaskConical, HeartPulse, Siren } from "lucide-react";
import { HELP_LINES, type HelpLine } from "@/lib/safety/resources";
import { cn } from "@/components/ui/cn";

const ICONS: Record<HelpLine["id"], typeof Siren> = {
  emergency: Siren,
  poison: FlaskConical,
  "mental-health": HeartPulse,
};

const ORDER: HelpLine["id"][] = ["emergency", "poison", "mental-health"];

/** Las tres líneas de ayuda de Colombia como enlaces para llamar (tel:). */
export function HelpLines({ variant = "inline", className }: { variant?: "inline" | "list"; className?: string }) {
  if (variant === "list") {
    return (
      <ul className={cn("space-y-2", className)}>
        {ORDER.map((id) => {
          const line = HELP_LINES[id];
          const Icon = ICONS[id];
          return (
            <li key={id}>
              <a
                href={`tel:${line.tel}`}
                className="flex items-center gap-3 rounded-2xl border border-line p-3.5 transition-colors hover:border-red-200 hover:bg-red-50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-slate-600">{line.name}</span>
                  <span className="block text-lg leading-tight font-bold text-ink">{line.display}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-slate-600">{line.note}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-5 gap-y-2 text-sm", className)}>
      {ORDER.map((id) => {
        const line = HELP_LINES[id];
        const Icon = ICONS[id];
        return (
          <li key={id}>
            <a href={`tel:${line.tel}`} className="inline-flex items-center gap-2 rounded-lg py-1 text-slate-700 hover:text-red-800">
              <Icon className="size-4 text-red-700" aria-hidden="true" />
              <span>{line.name}</span>
              <span className="font-bold text-ink">{line.display}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
