"use client";

import { Plus } from "lucide-react";
import { CAPSULE_COLORS, CapsuleIcon, capsuleColor } from "@/components/art/Capsule";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { formatLongDate, toISODate } from "@/lib/pillbox/dates";
import { SLOTS, SLOT_LABEL, dosesForDate, nextDose, slotOf } from "@/lib/pillbox/schedule";
import type { LogStatus, PillboxState } from "@/lib/pillbox/types";
import { DoseRow } from "./DoseRow";

interface TodayViewProps {
  state: PillboxState;
  now: Date;
  onSet: (key: string, status: LogStatus | null) => void;
  onAdd: () => void;
}

export function EmptyPillbox({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 px-6 py-14 text-center">
      <div className="flex -space-x-1" aria-hidden="true">
        {CAPSULE_COLORS.slice(0, 4).map((c) => (
          <CapsuleIcon key={c.id} color={c.id} className="size-12" />
        ))}
      </div>
      <h3 className="mt-5 text-xl font-bold">Aún no hay medicamentos en tu pastillero</h3>
      <p className="mt-2 max-w-md leading-relaxed text-slate-600">
        Agrega lo que te indicó tu médico, con el nombre y las horas de toma. Después podrás marcar cada toma y ver cómo vas en la semana.
      </p>
      <Button size="lg" className="mt-6" onClick={onAdd}>
        <Plus className="size-5" aria-hidden="true" />
        Agregar mi primer medicamento
      </Button>
    </div>
  );
}

export function TodayView({ state, now, onSet, onAdd }: TodayViewProps) {
  const today = toISODate(now);
  const doses = dosesForDate(state, today);
  const next = nextDose(state, now);
  const taken = doses.filter((d) => d.status === "taken").length;
  const handled = doses.filter((d) => d.status !== "pending").length;

  if (state.medications.length === 0) return <EmptyPillbox onAdd={onAdd} />;

  return (
    <section aria-labelledby="hoy-titulo">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 id="hoy-titulo" className="text-2xl font-bold tracking-tight first-letter:uppercase">
            {formatLongDate(today)}
          </h2>
          <p className="mt-1 text-slate-600">
            {doses.length === 0
              ? "Hoy no tienes tomas programadas."
              : handled === doses.length
                ? `Terminaste el día: ${taken} de ${doses.length} ${doses.length === 1 ? "toma tomada" : "tomas tomadas"}.`
                : `${handled} de ${doses.length} ${doses.length === 1 ? "toma registrada" : "tomas registradas"}.`}
          </p>
        </div>

        {doses.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Progreso de hoy">
            {doses.map((dose) => (
              <li
                key={dose.key}
                title={`${dose.name}: ${dose.status === "taken" ? "tomada" : dose.status === "skipped" ? "omitida" : "pendiente"}`}
                className={cn(
                  "h-3.5 w-9 rounded-full",
                  dose.status === "pending" && "border-2 border-dashed border-slate-300",
                  dose.status === "skipped" && "bg-red-200",
                )}
                style={dose.status === "taken" ? { backgroundColor: capsuleColor(dose.color).a } : undefined}
              >
                <span className="sr-only">{dose.name}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-6 space-y-7">
        {SLOTS.map((slot) => {
          const inSlot = doses.filter((d) => slotOf(d.time) === slot);
          if (inSlot.length === 0) return null;
          return (
            <section key={slot} aria-labelledby={`slot-${slot}`}>
              <h3 id={`slot-${slot}`} className="mb-2.5 text-sm font-bold text-slate-600">
                {SLOT_LABEL[slot]}
              </h3>
              <ul className="space-y-2.5">
                {inSlot.map((dose) => (
                  <DoseRow key={dose.key} dose={dose} now={now} isNext={next?.key === dose.key} onSet={onSet} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}
