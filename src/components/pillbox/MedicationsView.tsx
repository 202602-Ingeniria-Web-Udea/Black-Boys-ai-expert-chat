"use client";

import { CalendarRange, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { CapsuleIcon } from "@/components/art/Capsule";
import { Button } from "@/components/ui/Button";
import { describeDays, formatFullDate, formatTime } from "@/lib/pillbox/dates";
import type { Medication } from "@/lib/pillbox/types";
import { EmptyPillbox } from "./TodayView";

interface MedicationsViewProps {
  medications: Medication[];
  onAdd: () => void;
  onEdit: (medication: Medication) => void;
  onDelete: (medication: Medication) => void;
}

export function MedicationsView({ medications, onAdd, onEdit, onDelete }: MedicationsViewProps) {
  if (medications.length === 0) return <EmptyPillbox onAdd={onAdd} />;
  return (
    <section aria-labelledby="medicamentos-titulo">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="medicamentos-titulo" className="text-2xl font-bold tracking-tight">
          Mis medicamentos
        </h2>
        <Button onClick={onAdd}>
          <Plus className="size-[18px]" aria-hidden="true" />
          Agregar medicamento
        </Button>
      </div>
      <ul className="mt-5 space-y-3">
        {medications.map((medication) => (
          <li key={medication.id} className="flex flex-col gap-4 rounded-2xl border border-line p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-start gap-4">
              <CapsuleIcon color={medication.color} className="size-12 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-lg leading-tight font-bold">{medication.name}</h3>
                {medication.note ? <p className="mt-0.5 text-slate-600">{medication.note}</p> : null}
                <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
                  <Clock className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <span>
                    {medication.times.map(formatTime).join(" · ")} — {describeDays(medication.days)}
                  </span>
                </p>
                <p className="mt-1 flex items-start gap-2 text-sm text-slate-700">
                  <CalendarRange className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <span>
                    Desde el {formatFullDate(medication.startDate)}
                    {medication.endDate ? ` hasta el ${formatFullDate(medication.endDate)}` : ", sin fecha de fin"}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button variant="secondary" size="sm" onClick={() => onEdit(medication)} aria-label={`Editar ${medication.name}`}>
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(medication)} aria-label={`Eliminar ${medication.name}`}>
                <Trash2 className="size-4" aria-hidden="true" />
                Eliminar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
