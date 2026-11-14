"use client";

import { Check, ChevronLeft, ChevronRight, Minus } from "lucide-react";
import { capsuleColor, onCapsule } from "@/components/art/Capsule";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { WEEKDAY_SHORT, addDays, formatShortDate, formatTime, startOfWeek, toISODate, weekDates } from "@/lib/pillbox/dates";
import { adherence, doseKey, isActiveOn } from "@/lib/pillbox/schedule";
import type { LogStatus, Medication, PillboxState } from "@/lib/pillbox/types";
import { EmptyPillbox } from "./TodayView";

interface WeekViewProps {
  state: PillboxState;
  now: Date;
  weekStart: string;
  onWeekChange: (weekStart: string) => void;
  onSet: (key: string, status: LogStatus | null) => void;
  onAdd: () => void;
}

const STATUS_LABEL = { taken: "tomada", skipped: "omitida", pending: "pendiente" } as const;

/** pendiente → tomada → omitida → pendiente */
function nextStatus(current: LogStatus | undefined): LogStatus | null {
  if (current === undefined) return "taken";
  if (current === "taken") return "skipped";
  return null;
}

/** Barras de adherencia por día: un color, pista clara y el valor escrito sobre cada barra. */
function AdherenceBars({ state, days, now }: { state: PillboxState; days: string[]; now: Date }) {
  const values = days.map((day) => ({ day, ...adherence(state, day, day, now) }));
  const label = values
    .map((v, i) => `${WEEKDAY_SHORT[i]}: ${v.percent === null ? "sin tomas por evaluar" : `${v.percent} %`}`)
    .join(". ");
  const W = 330;
  const H = 96;
  const barW = 30;
  const gap = (W - 7 * barW) / 8;
  const top = 18;
  const trackH = 52;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-sm" role="img" aria-label={`Adherencia por día. ${label}`}>
      {values.map((v, i) => {
        const x = gap + i * (barW + gap);
        const fill = v.percent === null ? 0 : (v.percent / 100) * trackH;
        return (
          <g key={v.day}>
            <title>{`${WEEKDAY_SHORT[i]} ${formatShortDate(v.day)}: ${v.percent === null ? "sin tomas por evaluar" : `${v.taken} de ${v.due} tomas (${v.percent} %)`}`}</title>
            <rect x={x} y={top} width={barW} height={trackH} rx="6" fill="#eaf8f3" />
            {fill > 0 ? <rect x={x} y={top + trackH - fill} width={barW} height={fill} rx="6" fill="#00a67e" /> : null}
            <text x={x + barW / 2} y={top - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0d2b33">
              {v.percent === null ? "–" : v.percent}
            </text>
            <text x={x + barW / 2} y={top + trackH + 16} textAnchor="middle" fontSize="11" fill="#465c63">
              {WEEKDAY_SHORT[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function WeekView({ state, now, weekStart, onWeekChange, onSet, onAdd }: WeekViewProps) {
  const today = toISODate(now);
  const days = weekDates(weekStart);
  const isCurrent = weekStart === startOfWeek(today);

  const rows: Array<{ key: string; medication: Medication; time: string }> = [];
  for (const medication of state.medications) {
    if (!days.some((day) => isActiveOn(medication, day))) continue;
    for (const time of medication.times) rows.push({ key: `${medication.id}|${time}`, medication, time });
  }
  rows.sort((a, b) => a.time.localeCompare(b.time) || a.medication.name.localeCompare(b.medication.name, "es"));

  const week = adherence(state, days[0], days[6], now);

  if (state.medications.length === 0) return <EmptyPillbox onAdd={onAdd} />;

  return (
    <section aria-labelledby="semana-titulo">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="semana-titulo" className="text-2xl font-bold tracking-tight">
          {formatShortDate(days[0])} al {formatShortDate(days[6])}
        </h2>
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => onWeekChange(addDays(weekStart, -7))} aria-label="Semana anterior">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onWeekChange(startOfWeek(today))} disabled={isCurrent}>
            Esta semana
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onWeekChange(addDays(weekStart, 7))} aria-label="Semana siguiente">
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="mt-5 grid items-center gap-5 rounded-3xl border border-line p-5 sm:grid-cols-[auto_1fr] sm:gap-10">
        <div>
          <p className="text-sm font-bold text-slate-600">Adherencia de la semana</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight">{week.percent === null ? "–" : `${week.percent} %`}</p>
          <p className="mt-1 text-sm text-slate-600">
            {week.due === 0 ? "Todavía no hay tomas por evaluar." : `${week.taken} de ${week.due} tomas que ya correspondían.`}
          </p>
        </div>
        <AdherenceBars state={state} days={days} now={now} />
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full border-collapse text-sm sm:min-w-[680px]">
          <caption className="sr-only">Tomas de la semana del {formatShortDate(days[0])} al {formatShortDate(days[6])}. Pulsa una toma para cambiar su estado.</caption>
          <thead>
            <tr className="border-b border-line bg-mist">
              <th scope="col" className="sticky left-0 z-10 bg-mist px-2.5 py-3 text-left font-bold sm:min-w-48 sm:px-4">
                Medicamento
              </th>
              {days.map((day, index) => (
                <th key={day} scope="col" className="px-0 py-2 text-center font-semibold sm:px-2">
                  <span className={cn("inline-flex flex-col items-center rounded-xl px-1.5 py-1 sm:px-2.5", day === today && "bg-ink text-white")}>
                    <span className="text-xs sm:text-[13px]">{WEEKDAY_SHORT[index]}</span>
                    <span className="text-base leading-tight font-bold">{Number(day.slice(8))}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-600">
                  Esta semana no tienes tomas programadas.
                </td>
              </tr>
            ) : (
              rows.map(({ key, medication, time }) => {
                const color = capsuleColor(medication.color);
                return (
                  <tr key={key} className="border-b border-line last:border-0">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-2.5 py-1.5 text-left font-normal sm:px-4 sm:py-2.5">
                      <span className="flex items-center gap-2 sm:gap-3">
                        <span className="size-2.5 shrink-0 rounded-full sm:size-3.5" style={{ backgroundColor: color.a }} aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-[13px] leading-tight font-bold break-words sm:truncate sm:text-sm">{medication.name}</span>
                          <span className="block text-xs text-slate-600 sm:text-[13px]">{formatTime(time)}</span>
                        </span>
                      </span>
                    </th>
                    {days.map((day) => {
                      if (!isActiveOn(medication, day)) {
                        return (
                          <td key={day} className="px-0 py-2 text-center sm:px-2" aria-label="Sin toma programada">
                            <span className="inline-block size-1.5 rounded-full bg-slate-200" aria-hidden="true" />
                          </td>
                        );
                      }
                      const logKey = doseKey(medication.id, day, time);
                      const status = (state.log as Partial<Record<string, LogStatus>>)[logKey];
                      const shown = status ?? "pending";
                      const future = day > today;
                      return (
                        <td key={day} className="px-0 text-center sm:px-2">
                          <button
                            type="button"
                            disabled={future}
                            onClick={() => onSet(logKey, nextStatus(status))}
                            aria-label={`${medication.name}, ${formatTime(time)}, ${WEEKDAY_SHORT[days.indexOf(day)]} ${Number(day.slice(8))}: ${STATUS_LABEL[shown]}${future ? " (aún no llega el día)" : ". Pulsa para cambiar"}`}
                            className="group mx-auto flex h-12 w-full items-center justify-center rounded-lg disabled:cursor-default"
                          >
                            <span
                              className={cn(
                                "flex size-7 items-center justify-center rounded-full transition-colors sm:size-10",
                                shown === "skipped" && "border-2 border-red-300 bg-red-50 text-red-700",
                                shown === "skipped" && !future && "group-hover:bg-red-100",
                                shown === "pending" && "border-2 border-dashed border-slate-300",
                                shown === "pending" && !future && "group-hover:border-brand-500 group-hover:bg-brand-50",
                              )}
                              style={shown === "taken" ? { backgroundColor: color.a, color: onCapsule(medication.color) } : undefined}
                            >
                              {shown === "taken" ? <Check className="size-4 sm:size-5" strokeWidth={3} aria-hidden="true" /> : null}
                              {shown === "skipped" ? <Minus className="size-4 sm:size-5" strokeWidth={3} aria-hidden="true" /> : null}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-slate-600">Pulsa una toma para marcarla como tomada, luego como omitida y otra vez como pendiente. Los días que aún no llegan no se pueden marcar.</p>
    </section>
  );
}
