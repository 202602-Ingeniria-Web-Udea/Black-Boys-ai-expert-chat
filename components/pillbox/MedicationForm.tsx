"use client";

import { Check, Plus, X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { CAPSULE_COLORS } from "@/components/art/Capsule";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { FieldShell, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { WEEKDAY_LONG, WEEKDAY_SHORT, isValidISODate, isValidTime } from "@/lib/pillbox/dates";
import { newId } from "@/lib/pillbox/id";
import { normalizeTimes } from "@/lib/pillbox/schedule";
import { LIMITS, type ColorId, type Medication } from "@/lib/pillbox/types";

interface MedicationFormProps {
  /** null = medicamento nuevo. */
  medication: Medication | null;
  today: string;
  usedColors: ColorId[];
  onSave: (medication: Medication) => void;
  onClose: () => void;
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-ink transition-colors hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100 focus:outline-none";

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

export function MedicationForm({ medication, today, usedColors, onSave, onClose }: MedicationFormProps) {
  const formId = useId();
  const [name, setName] = useState(medication?.name ?? "");
  const [note, setNote] = useState(medication?.note ?? "");
  const [color, setColor] = useState<ColorId>(medication?.color ?? (CAPSULE_COLORS.find((c) => !usedColors.includes(c.id))?.id ?? "verde"));
  const [times, setTimes] = useState<string[]>(medication?.times ?? ["08:00"]);
  const [days, setDays] = useState<number[]>(medication?.days ?? ALL_DAYS);
  const [startDate, setStartDate] = useState(medication?.startDate ?? today);
  const [endDate, setEndDate] = useState(medication?.endDate ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleDay(day: number) {
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b)));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    const cleanName = name.replace(/\s+/g, " ").trim();
    if (!cleanName) found.name = "Escribe el nombre del medicamento";
    if (times.length === 0 || times.some((t) => !isValidTime(t))) found.times = "Agrega al menos una hora válida";
    if (days.length === 0) found.days = "Elige al menos un día";
    if (!isValidISODate(startDate)) found.startDate = "Elige la fecha de inicio";
    if (endDate && (!isValidISODate(endDate) || (isValidISODate(startDate) && endDate < startDate))) {
      found.endDate = "La fecha final no puede ser anterior a la de inicio";
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    onSave({
      id: medication?.id ?? newId(),
      name: cleanName,
      note: note.replace(/\s+/g, " ").trim(),
      color,
      times: normalizeTimes(times),
      days: [...days].sort((a, b) => a - b),
      startDate,
      endDate: endDate || null,
      createdAt: medication?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={medication ? "Editar medicamento" : "Agregar medicamento"}
      description="Anota lo que te indicó tu médico. Botiquín no sugiere cantidades ni horarios de tratamiento."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId}>
            {medication ? "Guardar cambios" : "Guardar medicamento"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-6">
        <TextField
          id="med-name"
          label="Nombre del medicamento"
          placeholder="Como aparece en el empaque o en tu fórmula"
          value={name}
          maxLength={LIMITS.name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          data-autofocus
        />
        <TextField
          id="med-note"
          label="Indicación (opcional)"
          placeholder="Por ejemplo: con comida, según fórmula médica"
          value={note}
          maxLength={LIMITS.note}
          onChange={(e) => setNote(e.target.value)}
          hint="Escribe lo que dice tu fórmula. No es una recomendación de Botiquín."
        />

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-800">Color de la cápsula</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color de la cápsula">
            {CAPSULE_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={color === c.id}
                aria-label={c.label}
                title={c.label}
                onClick={() => setColor(c.id)}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full border-2 transition-transform",
                  color === c.id ? "scale-105 border-ink" : "border-transparent hover:border-slate-300",
                )}
              >
                <span className="relative block h-6 w-10 overflow-hidden rounded-full border border-ink/20" aria-hidden="true">
                  <span className="absolute inset-y-0 left-0 w-1/2" style={{ backgroundColor: c.a }} />
                  <span className="absolute inset-y-0 right-0 w-1/2" style={{ backgroundColor: c.b }} />
                  {color === c.id ? <Check className="absolute inset-0 m-auto size-4 text-ink" strokeWidth={3} /> : null}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-800">Horas de toma</legend>
          <ul className="space-y-2">
            {times.map((time, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTimes((list) => list.map((t, i) => (i === index ? e.target.value : t)))}
                  aria-label={`Hora de toma ${index + 1}`}
                  className={cn(inputClass, "max-w-44")}
                />
                {times.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setTimes((list) => list.filter((_, i) => i !== index))}
                    className="flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-ink"
                    aria-label={`Quitar la hora ${index + 1}`}
                  >
                    <X className="size-5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {times.length < LIMITS.timesPerMedication ? (
            <Button variant="soft" size="sm" className="mt-2" onClick={() => setTimes((list) => [...list, "20:00"])}>
              <Plus className="size-4" aria-hidden="true" />
              Agregar otra hora
            </Button>
          ) : null}
          {errors.times ? (
            <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">
              {errors.times}
            </p>
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-800">Días de la semana</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_SHORT.map((label, index) => {
              const day = index + 1;
              const on = days.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(day)}
                  aria-pressed={on}
                  aria-label={WEEKDAY_LONG[index]}
                  className={cn(
                    "h-11 min-w-12 rounded-xl border-2 px-3 text-sm font-bold transition-colors",
                    on ? "border-brand-600 bg-brand-600 text-white" : "border-line text-slate-700 hover:border-slate-300",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-4 text-sm">
            <button type="button" className="font-semibold text-brand-700 underline underline-offset-2" onClick={() => setDays(ALL_DAYS)}>
              Todos los días
            </button>
            <button type="button" className="font-semibold text-brand-700 underline underline-offset-2" onClick={() => setDays([1, 2, 3, 4, 5])}>
              Lunes a viernes
            </button>
          </div>
          {errors.days ? (
            <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">
              {errors.days}
            </p>
          ) : null}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldShell id="med-start" label="Desde" error={errors.startDate}>
            <input id="med-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} aria-invalid={errors.startDate ? true : undefined} />
          </FieldShell>
          <FieldShell id="med-end" label="Hasta (opcional)" error={errors.endDate} hint="Déjalo vacío si no tiene fecha de fin.">
            <input id="med-end" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={inputClass} aria-invalid={errors.endDate ? true : undefined} />
          </FieldShell>
        </div>
      </form>
    </Modal>
  );
}
