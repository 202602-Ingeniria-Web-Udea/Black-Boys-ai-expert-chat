"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";

export interface DailyPoint {
  day: string; // YYYY-MM-DD
  count: number;
}

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function parseDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

function longLabel(day: string) {
  const { m, d, weekday } = parseDay(day);
  return `${WEEKDAYS[weekday]} ${d} ${MONTHS[m - 1]}`;
}

function shortLabel(day: string) {
  return String(parseDay(day).d);
}

/** Paso de la escala del eje Y: 4 intervalos con números redondos (1, 2, 5, 10, 20, 50, ...). */
function niceStep(max: number): number {
  for (let magnitude = 1; ; magnitude *= 10) {
    for (const base of [1, 2, 5]) {
      const step = base * magnitude;
      if (step * 4 >= max) return step;
    }
  }
}

const PLOT_HEIGHT = 176;

/**
 * Columnas: un solo color, barras delgadas con extremo redondeado y base recta, rejilla de líneas finas,
 * etiqueta solo en el valor máximo y en el último día, y la lectura completa (tooltip y tabla) para el resto.
 */
export function DailyChart({ data, title }: { data: DailyPoint[]; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const total = data.reduce((sum, p) => sum + p.count, 0);
  const max = Math.max(...data.map((p) => p.count), 0);
  const step = niceStep(Math.max(max, 4));
  const top = step * 4;
  const ticks = [4, 3, 2, 1, 0].map((i) => i * step);
  const maxIndex = data.findIndex((p) => p.count === max);

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-line px-6 text-center text-sm text-slate-500">
        Aún no hay preguntas en este período. Cuando alguien use el chat, verás aquí la actividad diaria.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          aria-pressed={asTable}
        >
          {asTable ? "Ver gráfico" : "Ver como tabla"}
        </button>
      </div>

      {asTable ? (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="bg-mist text-left text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  Día
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Preguntas
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.day} className="border-t border-line">
                  <td className="px-4 py-2 capitalize">{longLabel(p.day)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="group" aria-label={title} className="flex gap-2">
          {/* Eje Y */}
          <div className="relative w-8 shrink-0" style={{ height: PLOT_HEIGHT }} aria-hidden="true">
            {ticks.map((value) => (
              <span
                key={value}
                className="absolute right-0 -translate-y-1/2 text-xs text-slate-500 tabular-nums"
                style={{ top: `${(1 - value / top) * 100}%` }}
              >
                {value}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative" style={{ height: PLOT_HEIGHT }}>
              {/* Rejilla */}
              {ticks.map((value) => (
                <div
                  key={value}
                  className={cn("absolute inset-x-0 border-t", value === 0 ? "border-slate-300" : "border-line")}
                  style={{ top: `${(1 - value / top) * 100}%` }}
                  aria-hidden="true"
                />
              ))}

              {/* Columnas: cada una es un botón enfocable con área de impacto de todo el alto */}
              <div className="absolute inset-0 flex">
                {data.map((point, index) => {
                  const height = (point.count / top) * 100;
                  const isActive = active === index;
                  const showValue = !isActive && point.count > 0 && (index === maxIndex || index === data.length - 1);
                  const align = index < 2 ? "left-0" : index > data.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2";
                  return (
                    <button
                      key={point.day}
                      type="button"
                      className="group relative flex h-full min-w-0 flex-1 items-end justify-center focus-visible:outline-offset-0"
                      onPointerEnter={() => setActive(index)}
                      onPointerLeave={() => setActive((current) => (current === index ? null : current))}
                      onFocus={() => setActive(index)}
                      onBlur={() => setActive((current) => (current === index ? null : current))}
                      aria-label={`${longLabel(point.day)}: ${point.count} ${point.count === 1 ? "pregunta" : "preguntas"}`}
                    >
                      {showValue ? (
                        <span
                          className="absolute left-1/2 -translate-x-1/2 text-xs font-medium text-slate-700 tabular-nums"
                          style={{ bottom: `calc(${height}% + 4px)` }}
                        >
                          {point.count}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "block w-full max-w-6 rounded-t-[4px] transition-colors",
                          point.count === 0 ? "bg-transparent" : isActive ? "bg-brand-800" : "bg-brand-600",
                        )}
                        style={{ height: `${height}%`, minHeight: point.count > 0 ? 2 : 0 }}
                      />
                      {isActive ? (
                        <span
                          role="tooltip"
                          className={cn(
                            "pointer-events-none absolute z-10 w-max rounded-lg border border-line bg-white px-3 py-2 text-left shadow-lg",
                            align,
                          )}
                          style={{ bottom: `calc(${height}% + 10px)` }}
                        >
                          <span className="block text-base font-semibold text-slate-900 tabular-nums">
                            {point.count} {point.count === 1 ? "pregunta" : "preguntas"}
                          </span>
                          <span className="block text-xs text-slate-500 capitalize">{longLabel(point.day)}</span>
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Eje X */}
            <div className="mt-2 flex" aria-hidden="true">
              {data.map((point) => (
                <span key={point.day} className="min-w-0 flex-1 text-center text-xs text-slate-500 tabular-nums">
                  {shortLabel(point.day)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-sm text-slate-500">
        {longLabel(data[0].day)} a {longLabel(data[data.length - 1].day)}: {total} {total === 1 ? "pregunta" : "preguntas"} en total.
      </p>
    </div>
  );
}
