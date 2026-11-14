import { Check, Minus, Moon, Sun, Sunrise } from "lucide-react";
import { cn } from "@/components/ui/cn";

type Slot = "taken" | "missed" | "pending" | "none";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const TODAY = 2;
const ROWS: Array<{ label: string; Icon: typeof Sun; color: string; slots: Slot[] }> = [
  { label: "Mañana", Icon: Sunrise, color: "bg-capsule-green", slots: ["taken", "taken", "taken", "pending", "pending", "pending", "pending"] },
  { label: "Tarde", Icon: Sun, color: "bg-capsule-blue", slots: ["taken", "missed", "pending", "pending", "none", "pending", "none"] },
  { label: "Noche", Icon: Moon, color: "bg-capsule-violet", slots: ["taken", "taken", "pending", "pending", "pending", "pending", "pending"] },
];

/** Ilustración (no interactiva) del pastillero semanal que ofrece la aplicación. */
export function PillboxPreview() {
  return (
    <div
      className="rounded-3xl border border-line bg-white p-4 shadow-[0_24px_50px_-30px_rgba(13,43,51,0.35)] sm:p-6"
      role="img"
      aria-label="Ejemplo de pastillero semanal: tres tomas por día, con tomas marcadas, una omitida y varias pendientes."
    >
      <div className="grid grid-cols-[2rem_repeat(7,minmax(0,1fr))] items-center gap-x-1.5 gap-y-3 sm:grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] sm:gap-x-3">
        <span aria-hidden="true" />
        {DAYS.map((day, index) => (
          <span
            key={day}
            aria-hidden="true"
            className={cn(
              "mx-auto rounded-full px-2 py-0.5 text-[13px] font-semibold",
              index === TODAY ? "bg-ink text-white" : "text-slate-600",
            )}
          >
            {day}
          </span>
        ))}
        {ROWS.map(({ label, Icon, color, slots }) => (
          <div key={label} className="contents" aria-hidden="true">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Icon className="size-5 shrink-0 text-slate-500" />
              <span className="hidden sm:inline">{label}</span>
            </span>
            {slots.map((slot, index) => (
              <span key={index} className="flex justify-center">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full sm:size-10",
                    slot === "taken" && cn(color, "text-white"),
                    slot === "missed" && "border-2 border-red-300 bg-red-50 text-red-700",
                    slot === "pending" && cn("border-2 border-dashed border-slate-300", index === TODAY && "border-brand-600 bg-brand-50"),
                    slot === "none" && "text-slate-300",
                  )}
                >
                  {slot === "taken" ? <Check className="size-4 sm:size-5" strokeWidth={3} /> : null}
                  {slot === "missed" ? <Minus className="size-4 sm:size-5" strokeWidth={3} /> : null}
                  {slot === "none" ? <span className="size-1.5 rounded-full bg-slate-300" /> : null}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-[13px] text-slate-600" aria-hidden="true">
        <span className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-capsule-green text-white">
            <Check className="size-3" strokeWidth={3} />
          </span>
          Tomada
        </span>
        <span className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full border-2 border-red-300 bg-red-50 text-red-700">
            <Minus className="size-3" strokeWidth={3} />
          </span>
          Omitida
        </span>
        <span className="flex items-center gap-2">
          <span className="size-5 rounded-full border-2 border-dashed border-slate-300" />
          Pendiente
        </span>
      </div>
    </div>
  );
}
