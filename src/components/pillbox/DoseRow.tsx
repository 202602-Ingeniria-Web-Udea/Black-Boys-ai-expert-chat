"use client";

import { Check, Undo2 } from "lucide-react";
import { CapsuleIcon } from "@/components/art/Capsule";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { atTime, formatTime } from "@/lib/pillbox/dates";
import type { Dose } from "@/lib/pillbox/schedule";
import type { LogStatus } from "@/lib/pillbox/types";

interface DoseRowProps {
  dose: Dose;
  now: Date;
  isNext: boolean;
  onSet: (key: string, status: LogStatus | null) => void;
}

/** Una toma del día con sus acciones: tomé, omitir y deshacer. */
export function DoseRow({ dose, now, isNext, onSet }: DoseRowProps) {
  const overdue = dose.status === "pending" && atTime(dose.date, dose.time).getTime() < now.getTime();
  const when = `${dose.name} de las ${formatTime(dose.time)}`;
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        isNext ? "border-brand-300 bg-brand-50" : "border-line bg-white",
        dose.status !== "pending" && "bg-slate-50",
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <CapsuleIcon color={dose.color} className={cn("size-11 shrink-0", dose.status !== "pending" && "opacity-60")} />
        <div className="min-w-0">
          <p className={cn("truncate text-lg leading-tight font-bold", dose.status === "taken" && "text-slate-600")}>{dose.name}</p>
          <p className="mt-0.5 text-sm text-slate-600">
            {formatTime(dose.time)}
            {dose.note ? ` · ${dose.note}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {dose.status === "pending" ? (
          <>
            {overdue ? <Badge tone="warning">Atrasada</Badge> : isNext ? <Badge tone="brand">Siguiente</Badge> : null}
            <Button variant="primary" onClick={() => onSet(dose.key, "taken")} aria-label={`Marcar ${when} como tomada`}>
              <Check className="size-[18px]" aria-hidden="true" />
              Tomé
            </Button>
            <Button variant="ghost" onClick={() => onSet(dose.key, "skipped")} aria-label={`Omitir ${when}`}>
              Omitir
            </Button>
          </>
        ) : (
          <>
            <Badge tone={dose.status === "taken" ? "success" : "danger"}>{dose.status === "taken" ? "Tomada" : "Omitida"}</Badge>
            <Button variant="ghost" size="sm" onClick={() => onSet(dose.key, null)} aria-label={`Deshacer el registro de ${when}`}>
              <Undo2 className="size-4" aria-hidden="true" />
              Deshacer
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
